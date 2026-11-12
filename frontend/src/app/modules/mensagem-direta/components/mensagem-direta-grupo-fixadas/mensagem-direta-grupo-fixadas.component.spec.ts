import { describe, it, expect } from 'vitest';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { FixadaNoGrupo } from '../../services/mensagem-direta-grupo-estado.service';
import { MensagemDiretaGrupoFixadasComponent } from './mensagem-direta-grupo-fixadas.component';

// A faixa das mensagens fixadas do grupo (task 250): a mais recente à vista, a lista quando há mais de uma e os cliques que levam à mensagem ou desafixam.

const MEMBROS = [
    { usuarioId: 1, usuarioNome: 'Ana Souza', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, entradaData: new Date('2026-10-20T10:00:00Z'), online: false },
    { usuarioId: 9, usuarioNome: 'Bruno Lima', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null, entradaData: new Date('2026-10-20T10:00:00Z'), online: false },
];

function fixada(mensagemId: string, texto: string, autorUsuarioId = 9, contemCodigo = false): FixadaNoGrupo {
    return {
        mensagem: {
            mensagemId, conversaId: 'G7', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId, texto, contemCodigo, mencoes: [], referencias: [], respondeA: null,
            createdDate: new Date('2026-10-21T14:00:00Z'), editadaDate: null, reacoes: [], chamadaPorUsuarioId: null, propostaIds: [], situacao: 'ENVIADA',
        } as never,
        fixadaPorUsuarioId: 1,
        fixadaDate: new Date('2026-10-22T10:00:00Z'),
    };
}

async function montar(fixadas: FixadaNoGrupo[], podeDesafixar = true) {
    return montarComponente(MensagemDiretaGrupoFixadasComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { fixadas, membros: MEMBROS, meuId: 1, podeDesafixar } });
}

describe('MensagemDiretaGrupoFixadasComponent', () => {
    it('sem fixadas não mostra nada', async () => {
        const tela = await montar([]);
        expect(tela.elemento.querySelector('.fixadas-grupo')).toBeNull();
    });

    it('com uma fixada mostra o autor e a prévia, e o botão de desafixar', async () => {
        const tela = await montar([fixada('m1', 'Regras do deploy: sexta não')]);
        expect(tela.elemento.textContent).toContain('Bruno Lima:');
        expect(tela.elemento.textContent).toContain('Regras do deploy: sexta não');
        expect(tela.elemento.querySelector('[aria-label="Desafixar a mensagem"]')).not.toBeNull();
        expect(tela.elemento.textContent).not.toContain('fixadas');
    });

    it('a minha mensagem aparece como Você e código vira "bloco de código" na prévia', async () => {
        const tela = await montar([fixada('m1', '```ts\nconst a = 1;\n```', 1, true)]);
        expect(tela.elemento.textContent).toContain('Você:');
        expect(tela.elemento.textContent?.toLowerCase()).toContain('código');
    });

    it('clicar na fixada emite o id da mensagem para a conversa rolar até ela', async () => {
        const tela = await montar([fixada('m1', 'primeira')]);
        const ids: string[] = [];
        tela.componente.ir.subscribe((id) => ids.push(id));
        tela.elemento.querySelector<HTMLButtonElement>('.fixadas-grupo__corpo')!.click();
        expect(ids).toEqual(['m1']);
    });

    it('com mais de uma, mostra a mais recente e a contagem; a contagem abre a lista, e cada item leva à mensagem ou desafixa', async () => {
        const tela = await montar([fixada('m2', 'a mais nova'), fixada('m1', 'a mais antiga')]);
        expect(tela.elemento.textContent).toContain('a mais nova');
        expect(tela.elemento.textContent).not.toContain('a mais antiga');
        expect(tela.elemento.textContent).toContain('2 fixadas');

        tela.elemento.querySelector<HTMLButtonElement>('.fixadas-grupo__contagem')!.click();
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('a mais antiga');

        const ir: string[] = [];
        const desafixar: string[] = [];
        tela.componente.ir.subscribe((id) => ir.push(id));
        tela.componente.desafixar.subscribe((id) => desafixar.push(id));
        const itens = tela.elemento.querySelectorAll('.fixadas-grupo__item');
        itens[1].querySelector<HTMLButtonElement>('.fixadas-grupo__corpo')!.click();
        itens[1].querySelector<HTMLButtonElement>('[aria-label="Desafixar a mensagem"]')!.click();
        expect(ir).toEqual(['m1']);
        expect(desafixar).toEqual(['m1']);
    });

    it('quem só lê (sem poder desafixar) não vê o botão de desafixar', async () => {
        const tela = await montar([fixada('m1', 'primeira')], false);
        expect(tela.elemento.querySelector('[aria-label="Desafixar a mensagem"]')).toBeNull();
    });
});
