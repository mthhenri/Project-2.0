import { describe, it, expect } from 'vitest';
import { AutorMensagemDiretaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemNaConversa } from '../../utils/mensagem-direta.util';
import { MensagemDiretaIaRespostaComponent } from './mensagem-direta-ia-resposta.component';

// A resposta do `@IA` (task 315): para quem chamou (o usuário de teste, id 1) as propostas vêm com as ações; para a outra pessoa, cada proposta é lida
// pela conversa e vira o cartão só leitura ou "Ação oculta por falta de acesso".

const MENSAGEM_ID = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';
const BRUNO_ID = 9;
const PRIORIDADES = [{ codigo: 'INDEFINIDA', descricao: 'Indefinida', ordem: 5, cor: '#888888' }];
const PROPOSTA = {
    id: 31, usuarioId: BRUNO_ID, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status: StatusPropostaIaEnum.PENDENTE,
    dados: { nome: 'Revisar o cadastro', demandaNome: 'Cadastro' }, resultado: null, resolucaoData: null, aplicadaPelaIa: false, createdDate: '2026-11-11T12:00:00.000Z',
};

function resposta(parcial: Partial<MensagemNaConversa> = {}): MensagemNaConversa {
    return {
        mensagemId: MENSAGEM_ID, conversaId: '1-9', autor: AutorMensagemDiretaEnum.IA, autorUsuarioId: null, texto: 'Preparei a **atividade**.', contemCodigo: false,
        mencoes: [], referencias: [], respondeA: null, createdDate: new Date('2026-11-11T12:00:00'), editadaDate: null, reacoes: [],
        chamadaPorUsuarioId: 1, propostaIds: [], situacao: 'ENVIADA', ...parcial,
    };
}

async function montar(mensagem: MensagemNaConversa) {
    return montarComponente(MensagemDiretaIaRespostaComponent, {
        usuario: TipoUsuarioEnum.DESENVOLVEDOR,
        entradas: { mensagem, outroUsuarioId: BRUNO_ID, meuId: 1, nomeDeQuemChamou: 'Bruno Reis', horario: '12:00' },
    });
}

describe('MensagemDiretaIaRespostaComponent', () => {
    it('mostra o selo da IA, para quem ela respondeu, o texto em Markdown e o horário', async () => {
        const tela = await montar(resposta());
        expect(tela.elemento.querySelector('.ia-resposta__avatar')?.textContent?.trim()).toBe('IA');
        expect(tela.elemento.textContent).toContain('IA · para você');
        expect(tela.elemento.querySelector('strong')?.textContent).toBe('atividade');
        expect(tela.elemento.textContent).toContain('12:00');
        tela.http.verify();
    });

    it('destaca as pessoas que a IA marcou, como nas mensagens de pessoas (task 328)', async () => {
        const tela = await montarComponente(MensagemDiretaIaRespostaComponent, {
            usuario: TipoUsuarioEnum.DESENVOLVEDOR,
            entradas: {
                mensagem: resposta({ texto: 'Avisei o @Bruno Reis. @todos, reunião às 15h.', mencoes: [BRUNO_ID] }),
                outroUsuarioId: BRUNO_ID, meuId: 1, nomeDeQuemChamou: 'Bruno Reis', horario: '12:00', destaques: ['@Bruno Reis', '@todos'],
            },
        });
        const destacados = Array.from(tela.elemento.querySelectorAll('.markdown__destaque')).map((elemento) => elemento.textContent);
        expect(destacados).toEqual(['@Bruno Reis', '@todos']);
    });

    it('sem destaques informados, o texto da IA não marca nada', async () => {
        const tela = await montar(resposta({ texto: 'Falei com @Bruno Reis.' }));
        expect(tela.elemento.querySelector('.markdown__destaque')).toBeNull();
    });

    it('a resposta a outra pessoa diz o nome dela', async () => {
        const tela = await montar(resposta({ chamadaPorUsuarioId: BRUNO_ID }));
        expect(tela.elemento.textContent).toContain('IA · para Bruno Reis');
    });

    it('quem chamou vê o cartão da proposta, lido pela proposta (com as ações)', async () => {
        const tela = await montar(resposta({ propostaIds: [31] }));
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/proposta-ia/31'), { ...PROPOSTA, usuarioId: 1 });
        await tela.atualizar();
        expect(tela.elemento.querySelector('app-chat-proposta-cartao')).not.toBeNull();
        expect(tela.elemento.querySelector('[aria-label="Confirmar"], button[aria-label="Confirmar"]') ?? tela.elemento.textContent?.includes('Confirmar')).toBeTruthy();
    });

    it('quem chamou vê o grupo quando há duas ou mais propostas', async () => {
        const tela = await montar(resposta({ propostaIds: [31, 32] }));
        expect(tela.elemento.querySelector('app-chat-proposta-grupo')).not.toBeNull();
        expect(tela.elemento.querySelector('app-chat-proposta-cartao')).toBeNull();
    });

    it('a outra pessoa sem acesso vê "Ação oculta por falta de acesso", sem nenhum dado da proposta', async () => {
        const tela = await montar(resposta({ chamadaPorUsuarioId: BRUNO_ID, propostaIds: [31] }));
        expect(tela.elemento.textContent).toContain('Carregando proposta…');
        responderSucesso(esperarRequisicao(tela.http, 'GET', `/mensagem-direta/conversa/${BRUNO_ID}/mensagem/${MENSAGEM_ID}/proposta/31`), {
            propostaId: 31, acessivel: false, podeResolver: false, proposta: null,
        });
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Ação oculta por falta de acesso');
        expect(tela.elemento.querySelector('.pi-lock')).not.toBeNull();
        expect(tela.elemento.querySelector('app-chat-proposta-cartao')).toBeNull();
    });

    it('a outra pessoa com acesso vê o cartão só leitura: sem Confirmar, Ajustar nem Recusar', async () => {
        const tela = await montar(resposta({ chamadaPorUsuarioId: BRUNO_ID, propostaIds: [31] }));
        responderSucesso(esperarRequisicao(tela.http, 'GET', `/mensagem-direta/conversa/${BRUNO_ID}/mensagem/${MENSAGEM_ID}/proposta/31`), {
            propostaId: 31, acessivel: true, podeResolver: false, proposta: PROPOSTA,
        });
        await tela.atualizar();
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/atividade-prioridade'), PRIORIDADES);
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Revisar o cadastro');
        for (const acao of ['Confirmar', 'Ajustar', 'Recusar']) expect(tela.elemento.querySelector(`[aria-label="${acao}"]`)).toBeNull();
        expect(tela.elemento.textContent).toContain('Pendente');
        tela.http.verify();
    });

    it('erro ao carregar: avisa e "Tentar de novo" lê outra vez', async () => {
        const tela = await montar(resposta({ chamadaPorUsuarioId: BRUNO_ID, propostaIds: [31] }));
        const caminho = `/mensagem-direta/conversa/${BRUNO_ID}/mensagem/${MENSAGEM_ID}/proposta/31`;
        responderErro(esperarRequisicao(tela.http, 'GET', caminho), 500, 'falhou');
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Não foi possível carregar a proposta.');

        tela.elemento.querySelector<HTMLButtonElement>('.ia-resposta__tentar')!.click();
        responderSucesso(esperarRequisicao(tela.http, 'GET', caminho), { propostaId: 31, acessivel: false, podeResolver: false, proposta: null });
        await tela.atualizar();
        expect(tela.elemento.textContent).toContain('Ação oculta por falta de acesso');
    });
});
