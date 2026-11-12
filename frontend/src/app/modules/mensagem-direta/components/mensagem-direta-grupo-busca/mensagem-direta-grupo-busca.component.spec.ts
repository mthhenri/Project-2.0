import { describe, it, expect } from 'vitest';
import { signal } from '@angular/core';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaEventosService, OuvintesDoStream } from '../../services/mensagem-direta-eventos.service';
import { MensagemDiretaGrupoBuscaComponent } from './mensagem-direta-grupo-busca.component';

// A busca dentro do grupo (task 250): só o texto digitado (depois do atraso), o filtro "Com código", os estados e o clique que leva à mensagem.

class EventosFalso {
    readonly conectado = signal(true);
    iniciar(_ouvintes: OuvintesDoStream): void {}
    parar(): void {}
}

const MEMBROS = [{ usuarioId: 9, usuarioNome: 'Bruno Lima', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, entradaData: new Date('2026-10-20T10:00:00Z'), online: false }];

function achada(mensagemId: string, texto: string) {
    return {
        mensagemId, conversaId: 'G7', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 9, texto, contemCodigo: false, mencoes: [], referencias: [], respondeA: null,
        createdDate: '2026-10-21T14:00:00.000Z', editadaDate: null,
    };
}

async function montar() {
    return montarComponente(MensagemDiretaGrupoBuscaComponent, {
        usuario: TipoUsuarioEnum.DESENVOLVEDOR,
        entradas: { grupoId: 7, membros: MEMBROS },
        provedores: [{ provide: MensagemDiretaEventosService, useClass: EventosFalso }],
    });
}

const esperarOAtraso = () => new Promise((resolver) => setTimeout(resolver, 400));
async function digitar(tela: Awaited<ReturnType<typeof montar>>, texto: string): Promise<void> {
    const campo = tela.elemento.querySelector<HTMLInputElement>('input[aria-label="Buscar neste chat"]')!;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    await esperarOAtraso();
}

describe('MensagemDiretaGrupoBuscaComponent', () => {
    it('começa pedindo o texto, sem buscar nada', async () => {
        const tela = await montar();
        expect(tela.elemento.textContent).toContain('Digite para buscar nas mensagens deste chat');
        tela.http.expectNone(() => true);
    });

    it('busca só neste grupo, depois do atraso, e mostra os resultados com o termo realçado e o autor', async () => {
        const tela = await montar();
        await digitar(tela, 'reuniao');
        const requisicao = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca');
        expect(requisicao.request.params.get('texto')).toBe('reuniao');
        expect(requisicao.request.params.has('somenteCodigo')).toBe(false);
        responderSucesso(requisicao, { grupoId: 7, mensagens: [achada('m1', 'Reunião de planejamento na sexta')] });
        await tela.atualizar();

        expect(tela.elemento.textContent).toContain('1 resultado');
        expect(tela.elemento.textContent).toContain('Bruno Lima');
        expect(tela.elemento.querySelector('mark')?.textContent).toBe('Reunião');
    });

    it('"Com código" busca de novo com o filtro ligado', async () => {
        const tela = await montar();
        await digitar(tela, 'trecho');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca'), { grupoId: 7, mensagens: [] });
        await tela.atualizar();

        tela.elemento.querySelector<HTMLButtonElement>('.busca-grupo__codigo')!.click();
        const requisicao = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca');
        expect(requisicao.request.params.get('somenteCodigo')).toBe('true');
        responderSucesso(requisicao, { grupoId: 7, mensagens: [] });
        await tela.atualizar();
        expect(tela.elemento.querySelector('.busca-grupo__codigo')?.getAttribute('aria-pressed')).toBe('true');
    });

    it('sem resultado diz que nenhuma mensagem tem o termo', async () => {
        const tela = await montar();
        await digitar(tela, 'inexistente');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca'), { grupoId: 7, mensagens: [] });
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('nenhuma com “inexistente”');
    });

    it('erro na busca mostra o aviso e "Tentar de novo" busca outra vez', async () => {
        const tela = await montar();
        await digitar(tela, 'fila');
        responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca'), 500, 'falhou');
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Não foi possível buscar');

        Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Tentar de novo'))!.click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca'), { grupoId: 7, mensagens: [achada('m1', 'fila nova')] });
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('1 resultado');
    });

    it('clicar num resultado emite o id; apagar o texto volta ao estado inicial; Esc fecha', async () => {
        const tela = await montar();
        const ir: string[] = [];
        let fechou = 0;
        tela.componente.ir.subscribe((id) => ir.push(id));
        tela.componente.fechar.subscribe(() => fechou++);
        await digitar(tela, 'fila');
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/7/busca'), { grupoId: 7, mensagens: [achada('m1', 'fila nova')] });
        await tela.atualizar();

        tela.elemento.querySelector<HTMLButtonElement>('.busca-grupo__achado')!.click();
        expect(ir).toEqual(['m1']);

        tela.elemento.querySelector<HTMLButtonElement>('[aria-label="Limpar a busca"]')!.click();
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Digite para buscar');

        tela.elemento.querySelector<HTMLInputElement>('input')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(fechou).toBe(1);
    });
});
