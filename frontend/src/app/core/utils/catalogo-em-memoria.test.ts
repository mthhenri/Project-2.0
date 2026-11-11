import { describe, expect, it } from 'vitest';
import { Observable, Subject, firstValueFrom, throwError } from 'rxjs';
import { StandardResponse } from '@project20/shared';
import { CatalogoEmMemoria } from './catalogo-em-memoria';

function sucesso<Dados>(dados: Dados): StandardResponse<Dados> {
    return { sucesso: true, dados, mensagem: 'ok', erros: [] } as StandardResponse<Dados>;
}

function falha(): StandardResponse<string[]> {
    return { sucesso: false, dados: null, mensagem: 'não', erros: [] } as unknown as StandardResponse<string[]>;
}

/** Fonte que conta as consultas e responde na hora, com a versão atual da lista. */
function fonteImediata(versoes: string[][]) {
    const estado = { consultas: 0 };
    const buscar = (): Observable<StandardResponse<string[]>> =>
        new Observable((assinante) => {
            const resposta = sucesso(versoes[Math.min(estado.consultas, versoes.length - 1)]);
            estado.consultas++;
            assinante.next(resposta);
            assinante.complete();
        });
    return { estado, buscar };
}

describe('CatalogoEmMemoria', () => {
    it('a segunda leitura dentro do prazo vem da memória, sem consultar de novo', async () => {
        const { estado, buscar } = fonteImediata([['a']]);
        const catalogo = new CatalogoEmMemoria({ buscar, dono: () => 1, agora: () => 0 });

        await firstValueFrom(catalogo.obter());
        const segunda = await firstValueFrom(catalogo.obter());

        expect(estado.consultas).toBe(1);
        expect(segunda.dados).toEqual(['a']);
    });

    it('passado o prazo, a próxima leitura consulta de novo', async () => {
        const { estado, buscar } = fonteImediata([['a'], ['a', 'b']]);
        let relogio = 0;
        const catalogo = new CatalogoEmMemoria({ buscar, dono: () => 1, validadeMs: 60_000, agora: () => relogio });

        await firstValueFrom(catalogo.obter());
        relogio = 59_999;
        await firstValueFrom(catalogo.obter());
        expect(estado.consultas).toBe(1);

        relogio = 60_000;
        const renovada = await firstValueFrom(catalogo.obter());
        expect(estado.consultas).toBe(2);
        expect(renovada.dados).toEqual(['a', 'b']);
    });

    it('quem lê junto, com a consulta ainda em voo, compartilha a mesma requisição', async () => {
        const resposta = new Subject<StandardResponse<string[]>>();
        let consultas = 0;
        const catalogo = new CatalogoEmMemoria({
            buscar: () => {
                consultas++;
                return resposta;
            },
            dono: () => 1,
        });

        const primeira = firstValueFrom(catalogo.obter());
        const segunda = firstValueFrom(catalogo.obter());
        resposta.next(sucesso(['a']));
        resposta.complete();

        expect((await primeira).dados).toEqual(['a']);
        expect((await segunda).dados).toEqual(['a']);
        expect(consultas).toBe(1);
    });

    it('invalidar descarta a cópia: a leitura seguinte enxerga a gravação', async () => {
        const { estado, buscar } = fonteImediata([['a'], ['a', 'nova']]);
        const catalogo = new CatalogoEmMemoria({ buscar, dono: () => 1, agora: () => 0 });

        await firstValueFrom(catalogo.obter());
        catalogo.invalidar();
        const depois = await firstValueFrom(catalogo.obter());

        expect(estado.consultas).toBe(2);
        expect(depois.dados).toEqual(['a', 'nova']);
    });

    it('resposta que voltou depois de uma gravação não vira cópia (era velha)', async () => {
        const respostas: Subject<StandardResponse<string[]>>[] = [];
        const catalogo = new CatalogoEmMemoria({
            buscar: () => {
                const resposta = new Subject<StandardResponse<string[]>>();
                respostas.push(resposta);
                return resposta;
            },
            dono: () => 1,
            agora: () => 0,
        });

        const emVoo = firstValueFrom(catalogo.obter());
        catalogo.invalidar(); // gravação enquanto a primeira consulta ainda voava
        respostas[0].next(sucesso(['velha']));
        respostas[0].complete();
        await emVoo;

        const nova = firstValueFrom(catalogo.obter());
        expect(respostas.length).toBe(2); // a velha não foi guardada: consultou de novo
        respostas[1].next(sucesso(['atual']));
        respostas[1].complete();
        expect((await nova).dados).toEqual(['atual']);
    });

    it('resposta sem sucesso e erro de rede não ficam guardados', async () => {
        let consultas = 0;
        const respostas = [() => falha(), () => null];
        const catalogo = new CatalogoEmMemoria<string[]>({
            buscar: () => {
                const proxima = respostas[consultas++]?.();
                return proxima ? new Observable((assinante) => { assinante.next(proxima); assinante.complete(); }) : throwError(() => new Error('rede'));
            },
            dono: () => 1,
            agora: () => 0,
        });

        expect((await firstValueFrom(catalogo.obter())).sucesso).toBe(false);
        await expect(firstValueFrom(catalogo.obter())).rejects.toThrow('rede');
        expect(consultas).toBe(2);
    });

    it('a cópia de uma pessoa não é entregue a outra sessão', async () => {
        const { estado, buscar } = fonteImediata([['do gestor'], ['do outro']]);
        let dono: number | null = 1;
        const catalogo = new CatalogoEmMemoria({ buscar, dono: () => dono, agora: () => 0 });

        await firstValueFrom(catalogo.obter());
        dono = 2;
        const doOutro = await firstValueFrom(catalogo.obter());
        dono = null;
        await firstValueFrom(catalogo.obter());

        expect(estado.consultas).toBe(3);
        expect(doOutro.dados).toEqual(['do outro']);
    });
});
