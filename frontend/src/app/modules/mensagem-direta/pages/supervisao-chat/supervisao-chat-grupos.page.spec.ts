import { describe, it, expect } from 'vitest';
import { AutorMensagemDiretaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { SupervisaoChatPage } from './supervisao-chat.page';

// A supervisão dos grupos na tela do gestor (task 247): o seletor Chats internos / Grupos, a lista com o nome do grupo, a leitura e o grupo que virou privado (403).

const ANA = { usuarioId: 4, usuarioNome: 'Ana Souza', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null };
const BRUNO = { usuarioId: 9, usuarioNome: 'Bruno Lima', tipo: TipoUsuarioEnum.DESENVOLVEDOR, corAvatar: null };

function mensagem(parcial: Record<string, unknown> = {}) {
    return {
        mensagemId: 'm1', conversaId: 'G7', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 4, texto: 'Subi o PR do filtro',
        contemCodigo: false, mencoes: [], referencias: [], respondeA: null, editadaDate: null, reacoes: [], chamadaPorUsuarioId: null, propostaIds: [], createdDate: '2026-10-21T14:00:00.000Z', ...parcial,
    };
}

const GRUPO = { grupoId: 7, conversaId: 'G7', nome: 'Time do backend', corAvatar: null, emojiAvatar: null, membros: [ANA, BRUNO], totalMensagens: 2, ultimaMensagem: mensagem() };

function leitura(parcial: Record<string, unknown> = {}) {
    return { grupoId: 7, conversaId: 'G7', nome: 'Time do backend', membros: [ANA, BRUNO], proximoCursor: null, membrosAvisados: false, mensagens: [mensagem()], ...parcial };
}

async function montar() {
    const tela = await montarComponente(SupervisaoChatPage, { usuario: TipoUsuarioEnum.GESTOR });
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversas'), { conversas: [], total: 0, pagina: 1, porPagina: 20 });
    await tela.atualizar();
    return tela;
}

const botaoDoModo = (tela: Awaited<ReturnType<typeof montar>>, rotulo: string) =>
    Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('.supervisao-chat__modo')).find((botao) => botao.textContent?.includes(rotulo))!;

async function irParaOsGrupos(tela: Awaited<ReturnType<typeof montar>>, grupos: unknown[] = [GRUPO]) {
    botaoDoModo(tela, 'Grupos').click();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupos'), { grupos, total: grupos.length, pagina: 1, porPagina: 20 });
    await tela.atualizar();
}

describe('SupervisaoChatPage — grupos', () => {
    it('o seletor começa em Chats internos e trocar para Grupos lista os grupos com o nome, a prévia e o total', async () => {
        const tela = await montar();
        expect(['Chats internos', 'Grupos'].map((rotulo) => botaoDoModo(tela, rotulo).getAttribute('aria-pressed'))).toEqual(['true', 'false']);

        await irParaOsGrupos(tela);
        expect(botaoDoModo(tela, 'Grupos').getAttribute('aria-pressed')).toBe('true');
        expect(tela.elemento.textContent).toContain('1 grupo');
        expect(tela.elemento.querySelector('.supervisao-chat__item-nomes')?.textContent).toContain('Time do backend');
        expect(tela.elemento.textContent).toContain('Subi o PR do filtro');
        expect(tela.elemento.textContent).toContain('Grupos sem gestor nem administrador entre os membros');
    });

    it('sem grupos mostra o estado vazio', async () => {
        const tela = await montar();
        botaoDoModo(tela, 'Grupos').click();
        const requisicao = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupos');
        expect(requisicao.request.params.get('pagina')).toBe('1');
        responderSucesso(requisicao, { grupos: [], total: 0, pagina: 1, porPagina: 20 });
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Nenhuma conversa ainda');
    });

    it('abre o grupo em modo leitura: o nome, o aviso aos membros e as mensagens, sem campo de resposta', async () => {
        const tela = await montar();
        await irParaOsGrupos(tela);
        tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
        const abertura = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupo/7');
        expect(abertura.request.params.has('cursor')).toBe(false);
        responderSucesso(abertura, leitura({ membrosAvisados: true, mensagens: [mensagem({ mensagemId: 'm2', autor: AutorMensagemDiretaEnum.SISTEMA, autorUsuarioId: null, texto: 'Rita, gestor, leu este grupo' }), mensagem()] }));
        await tela.atualizar();

        expect(tela.elemento.querySelector('.supervisao-chat__leitura-nomes')?.textContent).toContain('Time do backend');
        expect(tela.elemento.querySelector('.supervisao-chat__faixa')?.textContent).toContain('lendo o grupo Time do backend');
        expect(tela.elemento.querySelector('.supervisao-chat__faixa')?.textContent).toContain('os membros são avisados');
        expect(tela.elemento.textContent).toContain('Rita, gestor, leu este grupo');
        expect(tela.elemento.textContent).toContain('Ana Souza');
        expect(tela.elemento.querySelector('textarea, [contenteditable="true"], .ProseMirror')).toBeNull();
    });

    it('as mensagens mais antigas do grupo usam o cursor na mesma rota', async () => {
        const tela = await montar();
        await irParaOsGrupos(tela);
        tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupo/7'), leitura({ proximoCursor: 'cursor-1' }));
        await tela.atualizar();
        Array.from(tela.elemento.querySelectorAll<HTMLButtonElement>('button')).find((botao) => botao.textContent?.includes('Mensagens anteriores'))!.click();
        const anteriores = esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupo/7');
        expect(anteriores.request.params.get('cursor')).toBe('cursor-1');
        responderSucesso(anteriores, leitura({ mensagens: [mensagem({ mensagemId: 'antiga', texto: 'mensagem antiga do grupo' })] }));
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('mensagem antiga do grupo');
    });

    it('grupo que virou privado (403) mostra o aviso de privado em vez das mensagens', async () => {
        const tela = await montar();
        await irParaOsGrupos(tela);
        tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
        responderErro(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupo/7'), 403, 'Este grupo envolve um gestor ou administrador e é privado');
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Conversa privada');
    });

    it('voltar para Chats internos fecha a leitura e relê as conversas', async () => {
        const tela = await montar();
        await irParaOsGrupos(tela);
        tela.elemento.querySelector<HTMLButtonElement>('.supervisao-chat__item')!.click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/grupo/7'), leitura());
        await tela.atualizar();
        botaoDoModo(tela, 'Chats internos').click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/supervisao/conversas'), { conversas: [], total: 0, pagina: 1, porPagina: 20 });
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Escolha uma conversa');
        expect(tela.elemento.querySelector('.supervisao-chat__leitura-nomes')).toBeNull();
    });
});
