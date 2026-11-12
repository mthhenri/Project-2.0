import { describe, it, expect } from 'vitest';
import { GrupoResumoIaDestinoEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderErro, responderSucesso } from '../../../../../testes/http-teste';
import { MensagemDiretaGrupoResumoComponent } from './mensagem-direta-grupo-resumo.component';

// O diálogo de resumo com a IA (task 249): período e código, a estimativa que não chama a IA, o resultado com copiar, a proposta de gravar que só grava ao confirmar, o canal
// de projeto que pede a demanda de destino e o grupo livre que só copia.

type Montado = ComponenteMontado<MensagemDiretaGrupoResumoComponent>;

const OPCOES = { ultimoResumoData: null, destino: GrupoResumoIaDestinoEnum.DEMANDA, demandaId: 12, projetoId: null };
const ESTIMATIVA = {
    quantidadeMensagens: 40, quantidadeBlocos: 1, quantidadeChamadas: 1, tokensEntradaEstimados: 1200, tokensSaidaEstimados: 900, custoEstimadoDolar: 0.0123,
    blocosDeCodigoOmitidos: 2, enviaCodigo: false, acimaDoTeto: false,
};
const RESUMO = { resumoId: 5, texto: '- decidiram usar a fila\n\n_Resumo gerado por IA._', quantidadeMensagens: 40, inicioData: '2026-11-05T10:00:00.000Z', fimData: '2026-11-12T10:00:00.000Z', tokensEntrada: 1000, tokensSaida: 200 };
const PROPOSTA = { propostaId: 77, demandaId: 12, demandaNome: 'Cadastro de clientes', textoAcrescentado: '## Resumo do chat (05/11/2026 a 12/11/2026)\n\n- decidiram usar a fila' };

async function abrir(opcoes: unknown = OPCOES): Promise<Montado> {
    const tela = await montarComponente(MensagemDiretaGrupoResumoComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, entradas: { visivel: true, grupoId: 21, nomeDoGrupo: 'Cadastro de clientes' } });
    await tela.atualizar();
    responderSucesso(esperarRequisicao(tela.http, 'GET', '/mensagem-direta/grupo/21/resumo'), opcoes);
    await tela.atualizar();
    return tela;
}

const doDialog = () => document.body.querySelector<HTMLElement>('.p-dialog') as HTMLElement;
const texto = () => doDialog()?.textContent ?? '';
const botao = (rotulo: string) => Array.from(doDialog().querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.includes(rotulo));
async function clicar(tela: Montado, rotulo: string): Promise<void> {
    const encontrado = botao(rotulo);
    if (!encontrado) throw new Error(`Botão "${rotulo}" não está no diálogo`);
    encontrado.click();
    await tela.atualizar();
}

async function ateOResultado(tela: Montado): Promise<void> {
    await clicar(tela, 'Ver estimativa');
    responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/estimativa'), ESTIMATIVA);
    await tela.atualizar();
    await clicar(tela, 'Gerar resumo');
    responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo'), RESUMO);
    await tela.atualizar();
}

describe('MensagemDiretaGrupoResumoComponent', () => {
    it('abre com o título, o aviso de consentimento e o código desligado, e diz que o chat ainda não foi resumido', async () => {
        await abrir();
        expect(texto()).toContain('Resumir com IA · Cadastro de clientes');
        expect(texto()).toContain('As mensagens do período vão ao provedor de IA configurado');
        expect(texto()).toContain('Este chat ainda não foi resumido');
        const caixa = doDialog().querySelector<HTMLInputElement>('input[type="checkbox"]');
        expect(caixa?.checked).toBe(false);
    });

    it('com um resumo anterior mostra a data dele e o período já começa ali: a estimativa leva esse início', async () => {
        const tela = await abrir({ ...OPCOES, ultimoResumoData: '2026-11-10T15:30:00.000Z' });
        expect(texto()).toContain('Último resumo deste chat até');
        expect(botao('Começar dali')).toBeDefined();

        await clicar(tela, 'Começar dali');
        await clicar(tela, 'Ver estimativa');
        const requisicao = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/estimativa');
        expect(requisicao.request.body.inicioData).toBe('2026-11-10T15:30:00.000Z');
        responderSucesso(requisicao, ESTIMATIVA);
    });

    it('a estimativa manda o período e a escolha do código sem gerar nada, e mostra mensagens, chamadas, tokens, custo e os blocos omitidos', async () => {
        const tela = await abrir();
        await clicar(tela, 'Ver estimativa');
        const requisicao = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/estimativa');
        expect(requisicao.request.body.enviaCodigo).toBe(false);
        expect(typeof requisicao.request.body.inicioData).toBe('string');
        responderSucesso(requisicao, ESTIMATIVA);
        await tela.atualizar();

        expect(texto()).toContain('40');
        expect(texto()).toContain('2100');
        expect(texto()).toContain('US$ 0.0123');
        expect(texto()).toContain('2 blocos de código serão omitidos');
        tela.http.expectNone((pedido) => pedido.method === 'POST' && pedido.url.endsWith('/resumo'));
    });

    it('período sem mensagens avisa e não deixa gerar', async () => {
        const tela = await abrir();
        await clicar(tela, 'Ver estimativa');
        responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/estimativa'), { ...ESTIMATIVA, quantidadeMensagens: 0, quantidadeChamadas: 0 });
        await tela.atualizar();
        expect(texto()).toContain('Não há mensagens neste período');
        expect(botao('Gerar resumo')?.disabled).toBe(true);
    });

    it('período acima do teto de chamadas avisa e não deixa gerar', async () => {
        const tela = await abrir();
        await clicar(tela, 'Ver estimativa');
        responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/estimativa'), { ...ESTIMATIVA, acimaDoTeto: true });
        await tela.atualizar();
        expect(texto()).toContain('grande demais');
        expect(botao('Gerar resumo')?.disabled).toBe(true);
    });

    it('gerar mostra o texto do resumo com a linha de IA e oferece copiar e gravar', async () => {
        const tela = await abrir();
        await ateOResultado(tela);
        expect(texto()).toContain('decidiram usar a fila');
        expect(texto()).toContain('Resumo gerado por IA');
        expect(botao('Copiar')).toBeDefined();
        expect(botao('Gravar na documentação')).toBeDefined();
    });

    it('a falha do servidor (IA fora do ar) aparece como erro no próprio diálogo, sem perder o período', async () => {
        const tela = await abrir();
        await clicar(tela, 'Ver estimativa');
        responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/estimativa'), ESTIMATIVA);
        await tela.atualizar();
        await clicar(tela, 'Gerar resumo');
        responderErro(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo'), 400, 'Não dá para resumir agora: a IA está fora do ar');
        await tela.atualizar();
        expect(texto()).toContain('a IA está fora do ar');
        expect(botao('Gerar resumo')).toBeDefined();
    });

    it('gravar cria a proposta, mostra exatamente o que será acrescentado e só confirma ao clicar', async () => {
        const tela = await abrir();
        await ateOResultado(tela);
        await clicar(tela, 'Gravar na documentação');
        const criacao = esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/5/proposta');
        expect(criacao.request.body).toEqual({ texto: RESUMO.texto });
        responderSucesso(criacao, PROPOSTA);
        await tela.atualizar();

        expect(texto()).toContain('acrescentado ao fim');
        expect(texto()).toContain('Cadastro de clientes');
        expect(texto()).toContain('decidiram usar a fila');
        tela.http.expectNone((pedido) => pedido.url.endsWith('/confirmar'));

        await clicar(tela, 'Confirmar e gravar');
        responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/5/proposta/77/confirmar'), { resumoId: 5, demandaId: 12 });
        await tela.atualizar();
        expect(texto()).toContain('Resumo gravado na documentação');
    });

    it('descartar a proposta recusa no servidor, não grava e volta ao resultado', async () => {
        const tela = await abrir();
        await ateOResultado(tela);
        await clicar(tela, 'Gravar na documentação');
        responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/5/proposta'), PROPOSTA);
        await tela.atualizar();

        await clicar(tela, 'Descartar');
        responderSucesso(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/5/proposta/77/recusar'), { resumoId: 5 });
        await tela.atualizar();

        expect(texto()).toContain('decidiram usar a fila');
        expect(botao('Gravar na documentação')).toBeDefined();
        tela.http.expectNone((pedido) => pedido.url.endsWith('/confirmar'));
    });

    it('quem não pode editar a demanda (403 na proposta) vê o motivo e continua podendo copiar', async () => {
        const tela = await abrir();
        await ateOResultado(tela);
        await clicar(tela, 'Gravar na documentação');
        responderErro(esperarRequisicao(tela.http, 'POST', '/mensagem-direta/grupo/21/resumo/5/proposta'), 403, 'Você não pode editar esta demanda: o resumo só pode ser copiado');
        await tela.atualizar();
        expect(texto()).toContain('o resumo só pode ser copiado');
        expect(botao('Copiar')).toBeDefined();
    });

    it('grupo livre só tem copiar: não oferece gravar na documentação', async () => {
        const tela = await abrir({ ultimoResumoData: null, destino: GrupoResumoIaDestinoEnum.NENHUM, demandaId: null, projetoId: null });
        await ateOResultado(tela);
        expect(botao('Copiar')).toBeDefined();
        expect(botao('Gravar na documentação')).toBeUndefined();
    });

    it('canal de projeto pede a demanda de destino antes de criar a proposta', async () => {
        const tela = await abrir({ ultimoResumoData: null, destino: GrupoResumoIaDestinoEnum.PROJETO, demandaId: null, projetoId: 3 });
        responderSucesso(esperarRequisicao(tela.http, 'GET', '/demanda'), { itens: [{ id: 12, nome: 'Cadastro', caminho: 'Cadastro', status: 'PLANEJADA' }], totalItens: 1, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });
        await ateOResultado(tela);
        expect(texto()).toContain('Demanda em que gravar');

        await clicar(tela, 'Gravar na documentação');
        expect(texto()).toContain('Escolha a demanda do projeto');
        tela.http.expectNone((pedido) => pedido.url.endsWith('/proposta'));
    });
});
