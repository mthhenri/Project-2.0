import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AutorChatEnum, ChatEventoDto, ContextoChatEnum, EstadoIaEnum, NivelIaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { campoDeMensagem, digitarNaMensagem, esperarCampoDeMensagem, teclarNaMensagem, textoDaMensagem } from '../../../../../testes/campo-mensagem';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { PadService } from '../../../usuario/services/pad.service';
import { ChatService, ErroDoChat } from '../../services/chat.service';
import { ModoDoChatEnum } from '../../utils/plano.util';
import { ChatPage } from './chat.page';

// Chat do dia (SYSTEM.SPEC.md §12 "chat" e "ia"): a mensagem é enviada por stream (ChatService.enviarMensagem, que usa fetch e já tem
// teste próprio), então aqui o envio é um dublê controlável; as leituras (hoje, conversas, disponibilidade, propostas) passam pelo
// HttpTestingController. Com a IA desligada a entrada fica desabilitada; fora do ar só avisa; o bom dia e a retomada são do servidor.

type Montado = ComponenteMontado<ChatPage>;

const HOJE = '2026-10-19';
const ONTEM = '2026-10-18';
const CONVERSA_DE_HOJE = `1-${HOJE}`;

function mensagem(autor: AutorChatEnum, texto: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    id: `m-${texto}`, conversaId: CONVERSA_DE_HOJE, usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor, texto,
    nivel: autor === AutorChatEnum.IA ? NivelIaEnum.RAPIDO : null, modelo: null, tokensEntrada: null, tokensSaida: null,
    assunto: null, tokensCache: null, propostaIds: [], execucaoId: null, atividadeId: null, demandaId: null,
    createdDate: '2026-10-19T12:00:00.000Z', ...sobrescrita,
  };
}

const DELA = (texto: string, sobrescrita: Record<string, unknown> = {}) => mensagem(AutorChatEnum.USUARIO, texto, sobrescrita);
const DA_IA = (texto: string, sobrescrita: Record<string, unknown> = {}) => mensagem(AutorChatEnum.IA, texto, sobrescrita);

interface OpcoesMontagem {
  usuario?: TipoUsuarioEnum;
  estado?: EstadoIaEnum;
  mensagens?: ReturnType<typeof mensagem>[];
  conversas?: Record<string, unknown>[];
  /** O que a lateral "Minhas demandas" recebe (padrão: nenhuma). */
  demandas?: Record<string, unknown>[];
  /** Parâmetros da URL (ex.: `mensagem` do "Iniciar atividade" da tela Execuções). */
  consulta?: Record<string, string>;
}

/** Monta a página e responde o que ela pede ao abrir: estado da IA, conversa de hoje e lista do histórico. */
async function montarChat(opcoes: OpcoesMontagem = {}): Promise<Montado> {
  const provedores = opcoes.consulta ? [{ provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(opcoes.consulta) } } }] : [];
  const montado = await montarComponente(ChatPage, { usuario: opcoes.usuario ?? TipoUsuarioEnum.DESENVOLVEDOR, provedores });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: opcoes.mensagens ?? [] });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: opcoes.conversas ?? [] });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano'), []);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), opcoes.demandas ?? []);
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: opcoes.estado ?? EstadoIaEnum.NO_AR });
  await montado.atualizar();
  return montado;
}

/** O seletor do topo abre num painel (overlay no `body`): clica no botão e devolve o painel. */
async function abrirSeletor(montado: Montado): Promise<HTMLElement> {
  montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Abrir conversas e planos"]')!.click();
  await montado.atualizar();
  return document.body.querySelector<HTMLElement>('.chat-seletor__painel')!;
}

/** Responde o que o envio e o fim deixam pendente (estado da IA e lista do histórico, relidos a cada resposta). */
function responderPendentes(montado: Montado, estado = EstadoIaEnum.NO_AR): void {
  for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/ia/disponibilidade'))) {
    responderSucesso(pedido, { estado });
  }
  for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/chat/conversas'))) {
    responderSucesso(pedido, { conversas: [] });
  }
}

/** Dublê de uma chamada de stream: o teste empurra os eventos e decide quando e como a chamada termina. */
function controlarFluxo(espiao: ReturnType<typeof vi.spyOn>, indiceDoCallback: number) {
  let aoEvento: (evento: ChatEventoDto) => void = () => undefined;
  let terminar: () => void = () => undefined;
  let falhar: (erro: unknown) => void = () => undefined;
  espiao.mockImplementation(((...argumentos: unknown[]) =>
    new Promise<void>((resolver, rejeitar) => {
      aoEvento = argumentos[indiceDoCallback] as (evento: ChatEventoDto) => void;
      terminar = resolver;
      falhar = rejeitar;
    })) as never);
  return {
    emitir: (evento: ChatEventoDto) => aoEvento(evento),
    terminar: () => terminar(),
    falhar: (erro: unknown) => falhar(erro),
  };
}

const conversaDa = (montado: Montado) => montado.elemento.querySelector('[aria-label="Conversa"]')!.textContent ?? '';
const texto = (montado: Montado) => montado.elemento.textContent ?? '';
/** O campo de mensagem (o editor formatado); o que está escrito nele e se aceita escrita saem dos ajudantes abaixo. */
const campo = (montado: Montado) => montado.elemento.querySelector<HTMLElement>('app-editor-mensagem');
const textoDoCampo = (montado: Montado) => textoDaMensagem(montado.fixture);
const campoDesabilitado = (montado: Montado) => campo(montado)?.querySelector('.editor-mensagem--desabilitado') != null;
const placeholderDoCampo = (montado: Montado) => campo(montado)?.querySelector('.editor-mensagem')?.getAttribute('data-placeholder');
const botaoEnviar = (montado: Montado) => montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Enviar"]')!;
/** O botão pelo texto ou pelo rótulo de acessibilidade (os ícones da linha compacta da proposta). */
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo || candidato.getAttribute('aria-label') === rotulo);
const sugestoesVisiveis = (montado: Montado) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Sugestões de mensagem"] button')).map((item) => item.textContent?.trim());
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((mensagemRecebida) => avisos.push(...[mensagemRecebida].flat()));
  return avisos;
};

async function digitar(montado: Montado, conteudo: string) {
  await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
  digitarNaMensagem(montado.fixture, conteudo);
  await montado.atualizar();
}

async function enviarPeloTeclado(montado: Montado, conteudo: string) {
  await digitar(montado, conteudo);
  expect(botaoEnviar(montado).disabled).toBe(false);
  // Pelo Enter (o clique no botão tem o próprio teste).
  teclarNaMensagem(montado.fixture, 'Enter');
  await montado.atualizar();
}

let enviarMensagemEspiao: ReturnType<typeof vi.spyOn>;
let iniciarBomDiaEspiao: ReturnType<typeof vi.spyOn>;
let iniciarRetomadaEspiao: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
  enviarMensagemEspiao = vi.spyOn(ChatService.prototype, 'enviarMensagem').mockResolvedValue();
  iniciarBomDiaEspiao = vi.spyOn(ChatService.prototype, 'iniciarBomDia').mockResolvedValue();
  iniciarRetomadaEspiao = vi.spyOn(ChatService.prototype, 'iniciarRetomada').mockResolvedValue();
});

afterEach(() => {
  TestBed.inject(DesfazerService).dispensarSemEncerrar();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('ChatPage — abrir a conversa de hoje', () => {
  it('mostra o esqueleto enquanto carrega e a conversa quando chega, cada autor no seu lugar, com o nível usado pela IA', async () => {
    const montado = await montarComponente(ChatPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), {
      conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Bom dia, IA'), DA_IA('Bom dia! Vamos ao que importa.', { nivel: NivelIaEnum.ANALITICO })],
    });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: [] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('Bom dia, IA');
    expect(conversaDa(montado)).toContain('Bom dia! Vamos ao que importa.');
    // O chip de nível fica no rodapé da resposta, ao lado do horário (task 193), e não mais no alto dela.
    const chip = montado.elemento.querySelector('[aria-label="Nível usado: analítico"]');
    expect(chip).not.toBeNull();
    expect(chip!.closest('.chat__rodape-mensagem')).not.toBeNull();
    expect(chip!.previousElementSibling?.classList.contains('chat__hora')).toBe(true);
    expect(montado.elemento.querySelector('[aria-label="Copiar a mensagem"]')).not.toBeNull();
    expect(montado.elemento.querySelector('[aria-label="Copiar a resposta"]')).not.toBeNull();
  });

  it('conversa vazia: avisa que não há mensagem hoje e oferece as sugestões iniciais do desenvolvedor', async () => {
    const montado = await montarChat();

    expect(texto(montado)).toContain('Nenhuma mensagem hoje ainda.');
    expect(sugestoesVisiveis(montado)).toEqual([
      'O que eu tenho pra fazer hoje?', 'Quero começar uma atividade', 'Corrigir um horário de ontem', 'Anotar algo no pad',
    ]);
  });

  it('as sugestões iniciais do gestor são as de equipe', async () => {
    const montado = await montarChat({ usuario: TipoUsuarioEnum.GESTOR });

    expect(sugestoesVisiveis(montado)).toContain('O que a equipe fez hoje?');
    expect(sugestoesVisiveis(montado)).toContain('Criar uma demanda');
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" recarrega a conversa', async () => {
    const montado = await montarComponente(ChatPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    esperarRequisicao(montado.http, 'GET', '/chat/hoje').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();

    expect(texto(montado)).toContain('Não foi possível carregar a conversa.');
    botao(montado, 'Tentar de novo')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Oi')] });
    await montado.atualizar();

    expect(texto(montado)).not.toContain('Não foi possível carregar a conversa.');
    expect(conversaDa(montado)).toContain('Oi');
  });
});

describe('ChatPage — enviar e receber a resposta', () => {
  it('o clique no botão Enviar envia a mensagem (P-018) sem recarregar a página', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    controlarFluxo(enviarMensagemEspiao, 1);
    await digitar(montado, 'Vou começar o login');

    const clique = new MouseEvent('click', { bubbles: true, cancelable: true });
    botaoEnviar(montado).dispatchEvent(clique);
    await montado.atualizar();

    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('Vou começar o login');
    expect(textoDoCampo(montado)).toBe('');
  });


  it('o botão Enviar só vale com texto; ao enviar, a mensagem aparece na hora e o campo é esvaziado', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    expect(botaoEnviar(montado).disabled).toBe(true);
    await digitar(montado, '   ');
    expect(botaoEnviar(montado).disabled).toBe(true);
    controlarFluxo(enviarMensagemEspiao, 1);

    await enviarPeloTeclado(montado, '  Vou começar o login  ');

    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('Vou começar o login');
    expect(conversaDa(montado)).toContain('Vou começar o login');
    expect(textoDoCampo(montado)).toBe('');
  });

  it('Enter envia; Shift+Enter não envia (quebra a linha)', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    controlarFluxo(enviarMensagemEspiao, 1);
    await digitar(montado, 'oi');

    teclarNaMensagem(montado.fixture, 'Enter', { shiftKey: true });
    await montado.atualizar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();

    teclarNaMensagem(montado.fixture, 'Enter');
    await montado.atualizar();
    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
  });

  it('enquanto a resposta não traz texto mostra "pensando"; os trechos vão se acumulando; no fim vira uma mensagem da IA', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);

    await enviarPeloTeclado(montado, 'Como está meu dia?');
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).not.toBeNull();
    expect(botaoEnviar(montado).disabled).toBe(true);
    expect(campoDesabilitado(montado)).toBe(true);

    fluxo.emitir({ tipo: 'trecho', texto: 'Você tem ' });
    montado.fixture.detectChanges();
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).toBeNull();
    expect(conversaDa(montado)).toContain('Você tem');

    fluxo.emitir({ tipo: 'trecho', texto: 'duas atividades.' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('Você tem duas atividades.');

    fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Você tem duas atividades.', { id: 'm-final' }) as never });
    fluxo.terminar();
    await montado.atualizar();

    expect(montado.elemento.querySelector('[aria-busy="true"].chat__ia-conteudo')).toBeNull();
    expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-final"]')).toHaveLength(1);
    expect(campoDesabilitado(montado)).toBe(false);
    // O fim relê o estado da IA e a lista do histórico (a conversa pode ter ganhado nome).
    expect(montado.http.match((requisicao) => requisicao.url.endsWith('/ia/disponibilidade'))).toHaveLength(1);
    expect(montado.http.match((requisicao) => requisicao.url.endsWith('/chat/conversas'))).toHaveLength(1);
  });

  it('a IA anotar no pad faz o pad reler o servidor ao concluir a ferramenta (P-041); outra ferramenta não', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const releitura = vi.spyOn(TestBed.inject(PadService), 'recarregarSecoesSemMudancaLocal').mockImplementation(() => undefined);
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Anota nas pendências');

    fluxo.emitir({ tipo: 'ferramenta', nome: 'consultar_pad', situacao: 'CONCLUIDA' });
    fluxo.emitir({ tipo: 'ferramenta', nome: 'propor_anotar_pad', situacao: 'EXECUTANDO' });
    expect(releitura).not.toHaveBeenCalled();
    fluxo.emitir({ tipo: 'ferramenta', nome: 'propor_anotar_pad', situacao: 'CONCLUIDA' });
    expect(releitura).toHaveBeenCalledTimes(1);

    fluxo.terminar();
    await montado.atualizar();
  });

  it('ferramenta executando mostra "consultando"; ao concluir, o aviso some', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Quanto trabalhei hoje?');

    fluxo.emitir({ tipo: 'ferramenta', nome: 'consultar_ponto', situacao: 'EXECUTANDO' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('consultando');

    fluxo.emitir({ tipo: 'ferramenta', nome: 'consultar_ponto', situacao: 'CONCLUIDA' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).not.toContain('consultando');

    fluxo.terminar();
    await montado.atualizar();
  });

  it('evento de proposta mostra o cartão da proposta dentro da resposta que chega e a mantém depois do fim', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Cria uma atividade de login');

    fluxo.emitir({ tipo: 'proposta', propostaId: 31 });
    montado.fixture.detectChanges();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/proposta-ia/31'), {
      id: 31, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status: StatusPropostaIaEnum.PENDENTE,
      dados: { nome: 'Tela de login', prioridade: 'INDEFINIDA' }, resultado: null, resolucaoData: null, createdDate: '2026-10-19T12:00:00.000Z',
    });
    montado.fixture.detectChanges();
    expect(texto(montado)).toContain('Tela de login');
    expect(botao(montado, 'Confirmar')).toBeDefined();

    fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Proposta criada.', { id: 'm-prop' }) as never });
    fluxo.terminar();
    await montado.atualizar();

    expect(montado.elemento.querySelectorAll('app-chat-proposta-cartao')).toHaveLength(1);
    expect(montado.elemento.querySelector('[data-mensagem-id="m-prop"] app-chat-proposta-cartao')).not.toBeNull();
  });

  // Task 225: a resposta em andamento e a mensagem gravada são o mesmo item da lista, então nada some nem pisca no `fim`.
  describe('a resposta que chega vira a mensagem gravada sem sumir', () => {
    const proposta = (id: number) => ({
      id, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status: StatusPropostaIaEnum.PENDENTE,
      dados: { nome: `Atividade ${id}`, prioridade: 'INDEFINIDA' }, resultado: null, resolucaoData: null, createdDate: '2026-10-19T12:00:00.000Z',
    });
    const cartoes = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('app-chat-proposta-cartao'));
    const conteudoDaUltimaIa = (montado: Montado) => Array.from(montado.elemento.querySelectorAll('.chat__linha--ia .chat__ia-conteudo')).at(-1) as HTMLElement | undefined;

    /** Responde as leituras que os cartões fazem ao nascer (prioridades uma vez, e cada proposta). */
    function carregarCartoes(montado: Montado, ids: number[]): void {
      for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/atividade-prioridade'))) responderSucesso(pedido, []);
      for (const id of ids) responderSucesso(esperarRequisicao(montado.http, 'GET', `/proposta-ia/${id}`), proposta(id));
    }

    it('com uma proposta: o cartão e o corpo da resposta são os mesmos elementos depois do fim, e a proposta não é pedida de novo', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
      await enviarPeloTeclado(montado, 'Cria uma atividade');

      fluxo.emitir({ tipo: 'trecho', texto: 'Preparei a proposta.' });
      fluxo.emitir({ tipo: 'proposta', propostaId: 31 });
      montado.fixture.detectChanges();
      carregarCartoes(montado, [31]);
      montado.fixture.detectChanges();
      const cartaoAoVivo = cartoes(montado)[0];
      const conteudoAoVivo = conteudoDaUltimaIa(montado);
      expect(cartaoAoVivo).toBeDefined();
      expect(conteudoAoVivo?.getAttribute('aria-busy')).toBe('true');

      fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Preparei a proposta.', { id: 'm-gravada', propostaIds: [31] }) as never });
      fluxo.terminar();
      montado.fixture.detectChanges();

      expect(cartoes(montado)).toHaveLength(1);
      expect(cartoes(montado)[0]).toBe(cartaoAoVivo);
      expect(cartaoAoVivo.isConnected).toBe(true);
      expect(conteudoDaUltimaIa(montado)).toBe(conteudoAoVivo);
      expect(conteudoDaUltimaIa(montado)?.hasAttribute('aria-busy')).toBe(false);
      expect(montado.elemento.querySelector('[data-mensagem-id="m-gravada"]')).not.toBeNull();
      expect(texto(montado)).not.toContain('Carregando proposta');
      // Nenhuma leitura nova da proposta: o cartão já carregado foi reaproveitado.
      montado.http.expectNone((requisicao) => requisicao.url.includes('/proposta-ia/31'));
      await montado.atualizar();
    });

    it('com duas propostas: os dois cartões aparecem ao vivo e continuam os mesmos depois do fim', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
      await enviarPeloTeclado(montado, 'Cria duas atividades');

      fluxo.emitir({ tipo: 'proposta', propostaId: 31 });
      fluxo.emitir({ tipo: 'proposta', propostaId: 32 });
      montado.fixture.detectChanges();
      carregarCartoes(montado, [31, 32]);
      montado.fixture.detectChanges();
      const aoVivo = cartoes(montado);
      expect(aoVivo).toHaveLength(2);
      // Duas propostas na mesma resposta são um grupo só (task 227), e o grupo também não é recriado no fim.
      const grupoAoVivo = montado.elemento.querySelector('app-chat-proposta-grupo');
      expect(grupoAoVivo).not.toBeNull();
      expect(montado.elemento.querySelectorAll('app-chat-proposta-grupo')).toHaveLength(1);

      fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Duas propostas.', { id: 'm-duas', propostaIds: [31, 32] }) as never });
      fluxo.terminar();
      montado.fixture.detectChanges();

      expect(montado.elemento.querySelector('app-chat-proposta-grupo')).toBe(grupoAoVivo);
      const depois = cartoes(montado);
      expect(depois).toHaveLength(2);
      expect(depois[0]).toBe(aoVivo[0]);
      expect(depois[1]).toBe(aoVivo[1]);
      expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-duas"] app-chat-proposta-cartao')).toHaveLength(2);
      await montado.atualizar();
    });

    it('ao reabrir a conversa, a mensagem com duas propostas mostra as duas, num grupo', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Duas propostas.', { id: 'm-duas', propostaIds: [31, 32] })] });
      carregarCartoes(montado, [31, 32]);
      await montado.atualizar();
      expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-duas"] app-chat-proposta-grupo')).toHaveLength(1);
      expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-duas"] app-chat-proposta-cartao')).toHaveLength(2);
      expect(botao(montado, 'Confirmar todas')).toBeDefined();
    });

    it('uma proposta só continua sendo o cartão, sem grupo', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Uma proposta.', { id: 'm-uma', propostaIds: [31] })] });
      carregarCartoes(montado, [31]);
      await montado.atualizar();
      expect(montado.elemento.querySelector('app-chat-proposta-grupo')).toBeNull();
      expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-uma"] app-chat-proposta-cartao')).toHaveLength(1);
      expect(botao(montado, 'Confirmar todas')).toBeUndefined();
    });

    it('sem proposta: a resposta em andamento vira a mensagem gravada no mesmo elemento, com rodapé só depois do fim', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
      await enviarPeloTeclado(montado, 'Bom dia');

      fluxo.emitir({ tipo: 'trecho', texto: 'Bom dia!' });
      montado.fixture.detectChanges();
      const conteudoAoVivo = conteudoDaUltimaIa(montado);
      expect(conteudoAoVivo?.querySelector('[aria-label="Copiar a resposta"]')).toBeNull();

      fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Bom dia!', { id: 'm-sem-proposta' }) as never });
      fluxo.terminar();
      montado.fixture.detectChanges();

      expect(conteudoDaUltimaIa(montado)).toBe(conteudoAoVivo);
      expect(cartoes(montado)).toHaveLength(0);
      expect(conteudoAoVivo?.querySelector('[aria-label="Copiar a resposta"]')).not.toBeNull();
      expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-sem-proposta"]')).toHaveLength(1);
      await montado.atualizar();
    });

    it('com falha no meio: o erro tira a resposta em andamento e mostra o aviso do sistema, sem deixar elemento solto', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
      await enviarPeloTeclado(montado, 'Cria uma atividade');

      fluxo.emitir({ tipo: 'trecho', texto: 'Vou criar' });
      fluxo.emitir({ tipo: 'proposta', propostaId: 31 });
      montado.fixture.detectChanges();
      carregarCartoes(montado, [31]);
      fluxo.emitir({ tipo: 'erro', mensagem: 'A IA não conseguiu responder agora.' });
      fluxo.terminar();
      await montado.atualizar();

      expect(conversaDa(montado)).toContain('A IA não conseguiu responder agora.');
      expect(montado.elemento.querySelector('[aria-label="Conversa"] [aria-busy="true"]')).toBeNull();
      expect(montado.elemento.querySelectorAll('.chat__linha--ia')).toHaveLength(1);
    });
  });

  // Task 225: só a rolagem que veio de uma interação do usuário conta como "subiu para ler"; a conversa que cresce (cartão que carrega)
  // também deixa o fim longe, e aí ela continua acompanhando.
  describe('rolagem da conversa', () => {
    /** A área de rolagem com a medida de layout que o jsdom não calcula. */
    function medirArea(montado: Montado, medidas: { scrollHeight: number; clientHeight: number; scrollTop: number }): HTMLElement {
      const area = montado.elemento.querySelector<HTMLElement>('[aria-label="Conversa"]')!;
      for (const [propriedade, valor] of Object.entries(medidas)) Object.defineProperty(area, propriedade, { configurable: true, writable: true, value: valor });
      return area;
    }
    const irParaOFimVisivel = (montado: Montado) => montado.elemento.querySelector('.chat__ir-para-o-fim') !== null;

    it('rolagem que o usuário fez (roda) longe do fim mostra "Ir para o fim" e para de acompanhar', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const area = medirArea(montado, { scrollHeight: 2000, clientHeight: 400, scrollTop: 300 });
      area.dispatchEvent(new WheelEvent('wheel'));
      area.dispatchEvent(new Event('scroll'));
      await montado.atualizar();
      expect(montado.componente.longeDoFim()).toBe(true);
      expect(irParaOFimVisivel(montado)).toBe(true);
    });

    it('evento de rolagem sem interação do usuário (a conversa cresceu) não vira "subiu": continua acompanhando', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const area = medirArea(montado, { scrollHeight: 2000, clientHeight: 400, scrollTop: 300 });
      area.dispatchEvent(new Event('scroll'));
      await montado.atualizar();
      expect(montado.componente.longeDoFim()).toBe(false);
      expect(irParaOFimVisivel(montado)).toBe(false);
    });

    it('depois que o usuário subiu, o crescimento da conversa não o puxa de volta', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const area = medirArea(montado, { scrollHeight: 2000, clientHeight: 400, scrollTop: 300 });
      area.dispatchEvent(new WheelEvent('wheel'));
      area.dispatchEvent(new Event('scroll'));
      expect(montado.componente.longeDoFim()).toBe(true);
      // A conversa cresce e chega outro evento de rolagem, agora sem interação: segue lendo onde estava.
      medirArea(montado, { scrollHeight: 2700, clientHeight: 400, scrollTop: 300 });
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 5000);
      area.dispatchEvent(new Event('scroll'));
      vi.useRealTimers();
      expect(montado.componente.longeDoFim()).toBe(true);
    });

    it('chegar perto do fim volta a acompanhar e esconde "Ir para o fim"', async () => {
      const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
      const area = medirArea(montado, { scrollHeight: 2000, clientHeight: 400, scrollTop: 300 });
      area.dispatchEvent(new WheelEvent('wheel'));
      area.dispatchEvent(new Event('scroll'));
      expect(montado.componente.longeDoFim()).toBe(true);
      medirArea(montado, { scrollHeight: 2000, clientHeight: 400, scrollTop: 1580 });
      area.dispatchEvent(new Event('scroll'));
      await montado.atualizar();
      expect(montado.componente.longeDoFim()).toBe(false);
      expect(irParaOFimVisivel(montado)).toBe(false);
    });
  });

  it('resolver o cartão (Confirmar) troca os botões de sugestão pelos próximos passos da proposta', async () => {
    const montado = await montarChat({
      mensagens: [DA_IA('Posso criar?', { propostaIds: [31] })],
    });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/proposta-ia/31'), {
      id: 31, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status: StatusPropostaIaEnum.PENDENTE,
      dados: { nome: 'Tela de login', prioridade: 'INDEFINIDA' }, resultado: null, resolucaoData: null, createdDate: '2026-10-19T12:00:00.000Z',
    });
    await montado.atualizar();

    botao(montado, 'Confirmar')!.click();
    responderSucesso(esperarRequisicao(montado.http, 'POST', '/proposta-ia/31/confirmar'), {
      id: 31, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status: StatusPropostaIaEnum.CONFIRMADA,
      dados: { nome: 'Tela de login', prioridade: 'INDEFINIDA' }, resultado: null, resolucaoData: null, createdDate: '2026-10-19T12:00:00.000Z',
    });
    montado.fixture.detectChanges();

    expect(sugestoesVisiveis(montado)).toEqual(['Começar essa atividade', 'Criar outra atividade nessa demanda', 'Anotar algo no pad']);
  });

  it('evento de erro mostra o aviso do sistema com "Tentar de novo", que reenvia a última mensagem do usuário', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Cria a atividade');

    fluxo.emitir({ tipo: 'erro', mensagem: 'A IA não conseguiu responder agora.' });
    fluxo.terminar();
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('A IA não conseguiu responder agora.');
    expect(montado.elemento.querySelector('[data-mensagem-id] [role="alert"]')).not.toBeNull();
    responderPendentes(montado, EstadoIaEnum.NO_AR);

    const segundoFluxo = controlarFluxo(enviarMensagemEspiao, 1);
    botao(montado, 'Tentar de novo')!.click();
    await montado.atualizar();

    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(2);
    expect(enviarMensagemEspiao.mock.calls[1][0]).toBe('Cria a atividade');
    // O reenvio não limpa nem copia o que estava no campo.
    expect(textoDoCampo(montado)).toBe('');
    segundoFluxo.terminar();
    await montado.atualizar();
  });

  it('o fluxo que acaba sem fim nem erro (conexão caiu) avisa que foi interrompido', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Oi');

    fluxo.emitir({ tipo: 'trecho', texto: 'Vou ver' });
    fluxo.terminar();
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('A conexão foi interrompida antes do fim da resposta.');
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).toBeNull();
  });

  it('recusa antes do fluxo (409): tira a mensagem otimista, devolve o texto ao campo, avisa e relê o estado da IA', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Pergunta importante');

    fluxo.falhar(new ErroDoChat('A IA está desligada.', 409));
    await montado.atualizar();

    expect(conversaDa(montado)).not.toContain('Pergunta importante');
    expect(textoDoCampo(montado)).toBe('Pergunta importante');
    expect(avisos).toEqual([expect.objectContaining({ severity: 'info', detail: 'A IA está desligada.' })]);
    expect(montado.http.match((requisicao) => requisicao.url.endsWith('/ia/disponibilidade'))).toHaveLength(1);
  });

  it('falha de conexão antes do fluxo (status 0) avisa com severidade de alerta e também devolve o texto', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Oi de novo');

    fluxo.falhar(new ErroDoChat('Sem conexão com o servidor. Tente de novo.', 0));
    await montado.atualizar();

    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', detail: 'Sem conexão com o servidor. Tente de novo.' })]);
    expect(textoDoCampo(montado)).toBe('Oi de novo');
  });
});

describe('ChatPage — sugestões', () => {
  it('as sugestões do evento "sugestoes" aparecem acima do campo; clicar numa envia como mensagem', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Oi');
    fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Quer começar?', { id: 'm-2' }) as never });
    fluxo.emitir({ tipo: 'sugestoes', itens: ['Sim, começar', 'Agora não'] });
    fluxo.terminar();
    await montado.atualizar();
    responderPendentes(montado);
    montado.fixture.detectChanges();

    expect(sugestoesVisiveis(montado)).toEqual(['Sim, começar', 'Agora não']);

    const segundoFluxo = controlarFluxo(enviarMensagemEspiao, 1);
    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Sugestões de mensagem"] button')!.click();
    await montado.atualizar();

    expect(enviarMensagemEspiao.mock.calls[1][0]).toBe('Sim, começar');
    expect(conversaDa(montado)).toContain('Sim, começar');
    // Mandar outra mensagem faz as sugestões da IA sumirem enquanto a resposta chega.
    expect(sugestoesVisiveis(montado)).toEqual([]);
    segundoFluxo.terminar();
    await montado.atualizar();
  });

  it('as sugestões somem enquanto o usuário digita (campo não vazio)', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    expect(sugestoesVisiveis(montado).length).toBeGreaterThan(0);

    await digitar(montado, 'algo');

    expect(sugestoesVisiveis(montado)).toEqual([]);
  });

  it('clicar numa sugestão inicial com a conversa vazia envia aquele texto', async () => {
    const montado = await montarChat();
    controlarFluxo(enviarMensagemEspiao, 1);

    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Sugestões de mensagem"] button')!.click();
    await montado.atualizar();

    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('O que eu tenho pra fazer hoje?');
  });
});

describe('ChatPage — IA desligada e fora do ar', () => {
  it('IA desligada: avisa, desabilita o campo e o envio, e "Ir para Atividades" leva ao fallback', async () => {
    const montado = await montarChat({ estado: EstadoIaEnum.DESLIGADA, mensagens: [DELA('Oi'), DA_IA('Olá!')] });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(texto(montado)).toContain('A IA está desligada.');
    expect(campoDesabilitado(montado)).toBe(true);
    expect(placeholderDoCampo(montado)).toBe('A IA está desligada');
    expect(botaoEnviar(montado).disabled).toBe(true);
    expect(sugestoesVisiveis(montado)).toEqual([]);
    // A conversa continua legível.
    expect(conversaDa(montado)).toContain('Olá!');

    botao(montado, 'Ir para Atividades')!.click();
    expect(navegar).toHaveBeenCalledWith('/atividade');
    expect(iniciarBomDiaEspiao).not.toHaveBeenCalled();
  });

  it('IA fora do ar: só avisa, o campo continua habilitado para tentar enviar mesmo assim', async () => {
    const montado = await montarChat({ estado: EstadoIaEnum.FORA_DO_AR, mensagens: [DA_IA('Olá!')] });

    expect(texto(montado)).toContain('A IA está fora do ar no momento.');
    expect(campoDesabilitado(montado)).toBe(false);
    await digitar(montado, 'Tem alguém aí?');
    expect(botaoEnviar(montado).disabled).toBe(false);
    expect(iniciarBomDiaEspiao).not.toHaveBeenCalled();
  });

  it('IA no ar: nenhum aviso de estado na tela', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });

    expect(montado.elemento.querySelector('[role="status"].chat__aviso')).toBeNull();
    expect(texto(montado)).not.toContain('A IA está desligada.');
    expect(texto(montado)).not.toContain('fora do ar');
  });
});

describe('ChatPage — bom dia', () => {
  it('sem resposta da IA hoje e com a IA no ar, pede o bom dia uma vez e mostra a resposta ao vivo', async () => {
    const fluxo = controlarFluxo(iniciarBomDiaEspiao, 0);
    const montado = await montarChat({ mensagens: [] });

    expect(iniciarBomDiaEspiao).toHaveBeenCalledTimes(1);
    fluxo.emitir({ tipo: 'trecho', texto: 'Bom dia! Hoje você tem' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('Bom dia! Hoje você tem');

    fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Bom dia! Hoje você tem 2 atividades.', { id: 'm-bomdia' }) as never });
    fluxo.terminar();
    await montado.atualizar();

    expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-bomdia"]')).toHaveLength(1);
    expect(iniciarBomDiaEspiao).toHaveBeenCalledTimes(1);
  });

  it('com resposta da IA já na conversa de hoje, não pede o bom dia', async () => {
    await montarChat({ mensagens: [DELA('Oi'), DA_IA('Olá!')] });

    expect(iniciarBomDiaEspiao).not.toHaveBeenCalled();
  });

  it('409 do bom dia (outra aba já deu) relê a conversa de hoje e o estado da IA', async () => {
    iniciarBomDiaEspiao.mockRejectedValue(new ErroDoChat('Já deu bom dia.', 409));
    const montado = await montarChat({ mensagens: [] });

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), {
      conversaId: CONVERSA_DE_HOJE, mensagens: [DA_IA('Bom dia (outra aba)')],
    });
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('Bom dia (outra aba)');
    expect(iniciarBomDiaEspiao).toHaveBeenCalledTimes(1);
  });
});

describe('ChatPage — retomada após queda da IA', () => {
  it('"Voltar para a IA" com conversa em andamento pede a retomada e mostra a resposta chegando', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi'), DA_IA('Olá!')] });
    const fluxo = controlarFluxo(iniciarRetomadaEspiao, 0);

    TestBed.inject(IaDisponibilidadeService).voltarParaAIa();
    await montado.atualizar();

    expect(iniciarRetomadaEspiao).toHaveBeenCalledTimes(1);
    fluxo.emitir({ tipo: 'trecho', texto: 'Voltei! Vi que você pausou a atividade.' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('Voltei! Vi que você pausou a atividade.');
    fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Voltei! Vi que você pausou a atividade.', { id: 'm-retomada' }) as never });
    fluxo.terminar();
    await montado.atualizar();

    expect(montado.elemento.querySelectorAll('[data-mensagem-id="m-retomada"]')).toHaveLength(1);
    // A retomada é consumida: não dispara de novo.
    expect(TestBed.inject(IaDisponibilidadeService).retomadaPendente()).toBe(false);
    expect(iniciarRetomadaEspiao).toHaveBeenCalledTimes(1);
  });

  it('sem resposta da IA ainda na conversa, a retomada não roda (o bom dia cobre)', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi')] });

    TestBed.inject(IaDisponibilidadeService).voltarParaAIa();
    await montado.atualizar();

    expect(iniciarRetomadaEspiao).not.toHaveBeenCalled();
  });

  it('abrir o chat à mão depois de "Agora não" é voltar para a IA: retoma a conversa', async () => {
    sessionStorage.setItem('ia_modo_convencional', '1');
    const montado = await montarComponente(ChatPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Oi'), DA_IA('Olá!')] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: [] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano'), []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    await montado.atualizar();

    expect(iniciarRetomadaEspiao).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(IaDisponibilidadeService).modoConvencional()).toBe(false);
  });

  it('409 da retomada (nada a retomar) relê a conversa de hoje', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi'), DA_IA('Olá!')] });
    iniciarRetomadaEspiao.mockRejectedValue(new ErroDoChat('Nada a retomar.', 409));

    TestBed.inject(IaDisponibilidadeService).voltarParaAIa();
    await montado.atualizar();

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Oi'), DA_IA('Olá!')] });
    await montado.atualizar();
    expect(iniciarRetomadaEspiao).toHaveBeenCalledTimes(1);
  });
});

describe('ChatPage — histórico: abrir um dia anterior', () => {
  const CONVERSAS = [
    { conversaId: CONVERSA_DE_HOJE, data: HOJE, titulo: 'Conversa de hoje', primeiraMensagem: 'Oi', tituloEditado: false, quantidadeDeMensagens: 2, ultimaMensagemDate: '2026-10-19T12:00:00.000Z' },
    { conversaId: `1-${ONTEM}`, data: ONTEM, titulo: 'Conversa de ontem', primeiraMensagem: 'Ontem', tituloEditado: false, quantidadeDeMensagens: 2, ultimaMensagemDate: '2026-10-18T12:00:00.000Z' },
  ];

  async function abrirOntem(): Promise<Montado> {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')], conversas: CONVERSAS });
    const painel = await abrirSeletor(montado);
    Array.from(painel.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes('Conversa de ontem'))!.click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', `/chat/conversa/${ONTEM}`), {
      conversaId: `1-${ONTEM}`,
      mensagens: [DELA('Falei ontem', { conversaId: `1-${ONTEM}` }), DA_IA('Respondi ontem', { conversaId: `1-${ONTEM}` })],
    });
    await montado.atualizar();
    return montado;
  }

  it('abre o dia escolhido só para leitura: mensagens daquele dia, aviso com a data e sem campo de envio', async () => {
    const montado = await abrirOntem();

    expect(conversaDa(montado)).toContain('Falei ontem');
    expect(conversaDa(montado)).toContain('Respondi ontem');
    expect(conversaDa(montado)).not.toContain('Oi de hoje');
    expect(texto(montado)).toContain('Conversa de 18/10/2026, só para leitura.');
    expect(montado.elemento.querySelector('[aria-label="Mensagem para a IA"]')).toBeNull();
    expect(sugestoesVisiveis(montado)).toEqual([]);
  });

  it('"Voltar para hoje" reabre a conversa de hoje com o campo de envio', async () => {
    const montado = await abrirOntem();

    botao(montado, 'Voltar para hoje')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')] });
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('Olá de hoje!');
    expect(texto(montado)).not.toContain('só para leitura');
    expect(campo(montado)).not.toBeNull();
  });

  it('escolher o dia de hoje na lista volta à conversa viva (sem abrir "dia anterior")', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')], conversas: CONVERSAS });

    const painel = await abrirSeletor(montado);
    Array.from(painel.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes('Conversa de hoje'))!.click();
    await montado.atualizar();

    montado.http.expectNone((requisicao) => requisicao.url.includes('/chat/conversa/'));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')] });
  });

  it('falha ao abrir o dia avisa e mantém a conversa de hoje', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')], conversas: CONVERSAS });
    const avisos = avisosDe(montado);

    const painel = await abrirSeletor(montado);
    Array.from(painel.querySelectorAll<HTMLButtonElement>('button')).find((item) => item.textContent?.includes('Conversa de ontem'))!.click();
    esperarRequisicao(montado.http, 'GET', `/chat/conversa/${ONTEM}`).flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();

    expect(avisos).toContainEqual(expect.objectContaining({ severity: 'warn', detail: 'Não foi possível abrir essa conversa' }));
    expect(conversaDa(montado)).toContain('Olá de hoje!');
  });

  it('um resultado da busca abre o dia da mensagem e rola até ela', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')], conversas: CONVERSAS });
    const painel = await abrirSeletor(montado);
    const campoBusca = painel.querySelector<HTMLInputElement>('[aria-label="Buscar em conversas e planos"]')!;
    campoBusca.value = 'ontem';
    campoBusca.dispatchEvent(new Event('input'));
    campoBusca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();
    const achada = DELA('Falei ontem', { id: 'm-achada', conversaId: `1-${ONTEM}` });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [achada] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano'), []);
    await montado.atualizar();

    Array.from(painel.querySelectorAll<HTMLButtonElement>('section[aria-label="Mensagens encontradas"] li button'))[0].click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', `/chat/conversa/${ONTEM}`), { conversaId: `1-${ONTEM}`, mensagens: [achada] });
    await montado.atualizar();
    await new Promise((resolver) => setTimeout(resolver, 80));

    expect(texto(montado)).toContain('só para leitura');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});

describe('ChatPage — copiar', () => {
  it('copia o texto da resposta e avisa; se o navegador recusar, avisa que não foi possível', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true });
    const montado = await montarChat({ mensagens: [DELA('Oi'), DA_IA('Resposta copiável')] });
    const avisos = avisosDe(montado);

    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Copiar a resposta"]')!.click();
    await montado.atualizar();
    expect(escrever).toHaveBeenCalledWith('Resposta copiável');
    expect(avisos).toEqual([expect.objectContaining({ severity: 'success', summary: 'Copiado' })]);

    escrever.mockRejectedValue(new Error('negado'));
    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Copiar a mensagem"]')!.click();
    await montado.atualizar();
    expect(avisos.at(-1)).toMatchObject({ severity: 'warn', detail: 'Não foi possível copiar' });
  });
});

describe('ChatPage — modo Planejamento (task 233)', () => {
  const PLANO = {
    id: 7, titulo: 'Plano da semana', projetoId: 10, projetoNome: 'Projeto Demo', demandaId: null, demandaNome: null, publicacaoData: null,
    criadorId: 1, criadorNome: 'Eu', isSolo: false, isArquivado: false, descricaoTecnica: 'Texto técnico', documentacao: null,
    versao: 3, createdDate: '2026-10-20T12:00:00.000Z', updatedDate: '2026-10-21T12:00:00.000Z',
  };
  const RESUMO = { id: 7, titulo: 'Plano da semana', projetoId: 10, projetoNome: 'Projeto Demo', demandaId: null, demandaNome: null, criadorId: 1, criadorNome: 'Eu', isSolo: false, isArquivado: false, updatedDate: '2026-10-21T12:00:00.000Z' };

  const chave = (montado: Montado, rotulo: string) =>
    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.chat__modo-opcao')).find((item) => item.textContent?.includes(rotulo))!;
  const divisor = (montado: Montado) => montado.elemento.querySelector<HTMLElement>('[role="separator"]');

  /** O plano em si (`/plano/<id>`), sem confundir com a conversa dele (`/chat/plano/<id>`). */
  const pedidoDoPlano = (montado: Montado, id: number) =>
    montado.http.expectOne((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith(`/plano/${id}`) && !requisicao.url.includes('/chat/'));
  const pedidoDaConversa = (montado: Montado, id: number) => esperarRequisicao(montado.http, 'GET', `/chat/plano/${id}`);

  /** Troca para Planejamento e responde o que a troca pede (a lista de planos, o plano mais recente e a conversa dele). */
  async function entrarEmPlanejamento(montado: Montado, mensagensDoPlano: unknown[] = [], autores: Record<number, string> = {}): Promise<void> {
    chave(montado, 'Planejamento').click();
    await responderListas(montado, [RESUMO]);
    responderSucesso(pedidoDoPlano(montado, 7), PLANO);
    responderSucesso(pedidoDaConversa(montado, 7), { conversaId: 'plano-7', planoId: 7, mensagens: mensagensDoPlano, autores });
    await montado.atualizar();
  }

  /** Responde as leituras da lista de planos que estiverem pendentes (a da troca de modo e a do seletor, relido ao fim do bom dia). */
  async function responderListas(montado: Montado, planos: unknown[]): Promise<void> {
    for (const pedido of montado.http.match((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/plano'))) responderSucesso(pedido, planos);
    for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/chat/conversas'))) responderSucesso(pedido, { conversas: [] });
    await montado.atualizar();
  }

  it('abre em Perguntas: sem documento nem divisor, e a chave de modo está no campo de mensagem', async () => {
    const montado = await montarChat();

    expect(chave(montado, 'Perguntas').getAttribute('aria-pressed')).toBe('true');
    expect(chave(montado, 'Planejamento').getAttribute('aria-pressed')).toBe('false');
    expect(divisor(montado)).toBeNull();
    expect(montado.elemento.querySelector('app-plano-documento')).toBeNull();
  });

  it('Planejamento abre o último plano da pessoa, com o documento e o divisor ao lado', async () => {
    const montado = await montarChat();

    await entrarEmPlanejamento(montado);

    expect(montado.elemento.querySelector('app-plano-documento')).not.toBeNull();
    expect(divisor(montado)).not.toBeNull();
    expect(texto(montado)).toContain('Nenhuma mensagem neste plano ainda.');
    expect(montado.elemento.querySelector('.chat-seletor__gatilho-texto')?.textContent).toBe('Plano da semana');
  });

  it('em Planejamento a conversa do dia sai e entra a do plano, com o campo de mensagem habilitado', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')] });

    await entrarEmPlanejamento(montado, [DELA('Vamos planejar o relatório', { conversaId: 'plano-7' }), DA_IA('Qual é o objetivo?', { conversaId: 'plano-7' })]);

    expect(conversaDa(montado)).toContain('Vamos planejar o relatório');
    expect(conversaDa(montado)).toContain('Qual é o objetivo?');
    expect(conversaDa(montado)).not.toContain('Olá de hoje!');
    expect(campoDesabilitado(montado)).toBe(false);
  });

  it('sem nenhum plano, Planejamento mostra "Nenhum plano aberto" e Novo plano cria um plano pessoal e o abre', async () => {
    const montado = await montarChat();

    chave(montado, 'Planejamento').click();
    await responderListas(montado, []);
    expect(texto(montado)).toContain('Nenhum plano aberto');

    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('.chat__sem-plano button')).find((item) => item.textContent?.includes('Novo plano'))!.click();
    const criacao = esperarRequisicao(montado.http, 'POST', '/plano');
    expect(criacao.request.body).toEqual({});
    responderSucesso(criacao, { id: 8, titulo: 'Plano sem título', projetoId: null, demandaId: null, isSolo: false, versao: 1 });
    await montado.atualizar();
    responderSucesso(pedidoDoPlano(montado, 8), { ...PLANO, id: 8, titulo: 'Plano sem título', projetoId: null, projetoNome: null });
    responderSucesso(pedidoDaConversa(montado, 8), { conversaId: 'plano-8', planoId: 8, mensagens: [], autores: {} });
    await responderListas(montado, []);

    expect(texto(montado)).toContain('Pessoal');
    expect(montado.elemento.querySelector('.chat-seletor__gatilho-texto')?.textContent).toBe('Plano sem título');
  });

  it('voltar para Perguntas devolve a conversa do dia e tira o documento', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')] });
    await entrarEmPlanejamento(montado);

    chave(montado, 'Perguntas').click();
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('Olá de hoje!');
    expect(montado.elemento.querySelector('app-plano-documento')).toBeNull();
    expect(campo(montado)).not.toBeNull();
  });

  it('o divisor muda a largura do documento pelo teclado, respeita os limites e a lembra', async () => {
    const montado = await montarChat();
    await entrarEmPlanejamento(montado);

    expect(divisor(montado)!.getAttribute('aria-valuenow')).toBe('50');
    divisor(montado)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    divisor(montado)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await montado.atualizar();

    expect(divisor(montado)!.getAttribute('aria-valuenow')).toBe('54');
    expect(localStorage.getItem('chat.documento.largura')).toBe('54');
    for (let vezes = 0; vezes < 20; vezes++) divisor(montado)!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await montado.atualizar();
    expect(divisor(montado)!.getAttribute('aria-valuenow')).toBe('70');
  });

  it('a largura guardada é a de partida', async () => {
    const montado = await montarComponente(ChatPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR, armazenamento: { 'chat.documento.largura': '40' } });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: [] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/plano'), []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    await montado.atualizar();

    expect(montado.componente.larguraDocumento()).toBe(40);
  });

  it('a IA desligada não impede abrir e ler o plano: o aviso fica na conversa e o documento aparece', async () => {
    const montado = await montarChat({ estado: EstadoIaEnum.DESLIGADA });

    await entrarEmPlanejamento(montado);

    expect(texto(montado)).toContain('A IA está desligada');
    expect(montado.elemento.querySelector('app-plano-documento')).not.toBeNull();
  });

  it('na conversa do plano as mensagens de outra pessoa trazem o nome dela; as da própria pessoa, não (task 234)', async () => {
    const montado = await montarChat();

    await entrarEmPlanejamento(
      montado,
      [DELA('Eu comecei', { conversaId: 'plano-7', id: 'm-minha' }), DELA('Eu completo', { conversaId: 'plano-7', id: 'm-dela', usuarioId: 2 }), DA_IA('Ok', { conversaId: 'plano-7' })],
      { 1: 'Eu mesmo', 2: 'Gabi Gestora' },
    );

    const nomes = Array.from(montado.elemento.querySelectorAll('.chat__autor')).map((nome) => nome.textContent?.trim());
    expect(nomes).toEqual(['Gabi Gestora']);
  });

  it('enviar em Planejamento usa a rota do plano, mostra a resposta na conversa do plano e deixa a conversa do dia como estava (task 234)', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')] });
    await entrarEmPlanejamento(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);

    await enviarPeloTeclado(montado, 'Descreva o relatório');
    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('Descreva o relatório');
    expect(enviarMensagemEspiao.mock.calls[0][3]).toBe('/chat/plano/7/mensagem');
    expect(conversaDa(montado)).toContain('Descreva o relatório');

    fluxo.emitir({ tipo: 'trecho', texto: 'Qual é o objetivo?' });
    fluxo.emitir({ tipo: 'fim', mensagem: DA_IA('Qual é o objetivo?', { conversaId: 'plano-7', id: 'm-resposta' }) } as never);
    fluxo.terminar();
    await montado.atualizar();

    expect(conversaDa(montado)).toContain('Qual é o objetivo?');
    expect(montado.componente.mensagensDoPlano().map((mensagem) => mensagem.texto)).toEqual(['Descreva o relatório', 'Qual é o objetivo?']);
    expect(montado.componente.mensagens().map((mensagem) => mensagem.texto)).toEqual(['Oi de hoje', 'Olá de hoje!']);
    responderPendentes(montado);
  });

  it('a IA escrever no plano relê o documento (a ferramenta escrever_no_plano concluída)', async () => {
    const montado = await montarChat();
    await entrarEmPlanejamento(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'Escreva a descrição técnica');

    fluxo.emitir({ tipo: 'ferramenta', nome: 'escrever_no_plano', situacao: 'EXECUTANDO' });
    fluxo.emitir({ tipo: 'ferramenta', nome: 'escrever_no_plano', situacao: 'CONCLUIDA' });

    responderSucesso(pedidoDoPlano(montado, 7), { ...PLANO, versao: 4, descricaoTecnica: 'Texto novo da IA' });
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-plano-documento')).not.toBeNull();
    fluxo.terminar();
    await montado.atualizar();
    responderPendentes(montado);
  });

  it('aceitar uma alteração de trecho relê o documento; recusar não (task 234)', async () => {
    const montado = await montarChat();
    await entrarEmPlanejamento(montado);
    const proposta = (status: StatusPropostaIaEnum) => ({ id: 3, usuarioId: 1, tipo: TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO, status, dados: {}, resultado: null, resolucaoData: null, createdDate: '2026-10-19T12:00:00.000Z' });

    montado.componente.aoResolverProposta(proposta(StatusPropostaIaEnum.EXPIRADA) as never);
    montado.http.expectNone((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/plano/7') && !requisicao.url.includes('/chat/'));

    montado.componente.aoResolverProposta(proposta(StatusPropostaIaEnum.CONFIRMADA) as never);
    responderSucesso(pedidoDoPlano(montado, 7), { ...PLANO, versao: 4 });
    await montado.atualizar();
  });

  it('o pedido de alteração de um trecho vira uma mensagem na conversa do plano, com o trecho e o que mudar', async () => {
    const montado = await montarChat();
    await entrarEmPlanejamento(montado);
    controlarFluxo(enviarMensagemEspiao, 1);

    montado.componente.pedirAlteracaoDoTrecho({ aba: 'DESCRICAO_TECNICA' as never, trecho: 'Primeira linha\nSegunda linha', selecao: 'Primeira linha\nSegunda linha', pedido: 'deixar mais direto' });
    await montado.atualizar();

    const enviada = enviarMensagemEspiao.mock.calls[0][0] as string;
    expect(enviada).toContain('DESCRICAO_TECNICA');
    expect(enviada).toContain('> Primeira linha\n> Segunda linha');
    expect(enviada).toContain('O que mudar: deixar mais direto');
    expect(enviarMensagemEspiao.mock.calls[0][3]).toBe('/chat/plano/7/mensagem');
  });

  it('sem plano aberto não há conversa: o campo fica desabilitado e nada é enviado', async () => {
    const montado = await montarChat();
    chave(montado, 'Planejamento').click();
    await responderListas(montado, []);

    expect(texto(montado)).toContain('Abra ou crie um plano para conversar.');
    expect(campoDesabilitado(montado)).toBe(true);
    await montado.componente.enviar('Oi');
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();
  });

  it('a IA anotar ou fechar um ponto relê o painel de pontos, sem reler o documento (task 235)', async () => {
    const montado = await montarChat();
    await entrarEmPlanejamento(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);
    await enviarPeloTeclado(montado, 'O que ficou em aberto?');
    const pedidosDePontos = () => montado.http.match((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/plano/7/ponto'));
    pedidosDePontos();

    fluxo.emitir({ tipo: 'ferramenta', nome: 'anotar_ponto_em_aberto', situacao: 'CONCLUIDA' });
    fluxo.emitir({ tipo: 'ferramenta', nome: 'resolver_ponto_do_plano', situacao: 'EXECUTANDO' });

    expect(pedidosDePontos()).toHaveLength(1);
    montado.http.expectNone((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/plano/7') && !requisicao.url.includes('/chat/'));
    expect(montado.elemento.querySelector('app-plano-pontos')).not.toBeNull();
    fluxo.terminar();
    await montado.atualizar();
    responderPendentes(montado);
  });
});

// "Minhas demandas" (task 245): a lateral à direita lista as demandas executadas; abrir uma divide a tela, só para leitura.
describe('ChatPage: minhas demandas', () => {
  const RESUMO_DA_DEMANDA = {
    demandaId: 9, nome: 'Cadastro de usuário', caminho: 'Segurança › Cadastro de usuário', projetoId: 3, nomeProjeto: 'Portal', status: 'PENDENTE',
    horasEstimadas: 8, minutosExecutados: 120, totalAtividades: 4, atividadesDesenvolvidas: 1, executando: false, ultimaExecucaoData: '2026-10-25T12:00:00.000Z',
  };
  const DEMANDA_ABERTA = {
    id: 9, nome: 'Cadastro de usuário', projetoId: 3, status: 'PENDENTE', horasEstimadas: 8, descricaoTecnica: 'Técnica', descricaoCliente: null, documentacao: null, podeEditar: true,
  };

  async function abrirDemandaNaLateral(montado: Montado): Promise<void> {
    montado.elemento.querySelector<HTMLButtonElement>('.minhas-demandas__item')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), DEMANDA_ABERTA);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade'), { itens: [], totalItens: 0, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });
    await montado.atualizar();
  }

  it('em Perguntas a lateral é a lista "Minhas demandas" (o histórico mora no seletor do topo)', async () => {
    const montado = await montarChat({ demandas: [RESUMO_DA_DEMANDA] });

    expect(montado.elemento.querySelector('app-chat-minhas-demandas')).not.toBeNull();
    expect(montado.elemento.querySelector('app-chat-demanda-leitura')).toBeNull();
    expect(montado.elemento.querySelector('.chat__divisor')).toBeNull();
    expect(montado.elemento.textContent).toContain('Cadastro de usuário');
  });

  it('clicar numa demanda fecha a lista e divide a tela com a demanda; Demandas volta à lista', async () => {
    const montado = await montarChat({ demandas: [RESUMO_DA_DEMANDA] });
    await abrirDemandaNaLateral(montado);

    expect(montado.elemento.querySelector('app-chat-minhas-demandas')).toBeNull();
    expect(montado.elemento.querySelector('app-chat-demanda-leitura')).not.toBeNull();
    expect(montado.elemento.querySelector('.chat__divisor')).not.toBeNull();

    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('app-chat-demanda-leitura button')).find((botao) => botao.textContent?.includes('Demandas'))!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [RESUMO_DA_DEMANDA]);
    await montado.atualizar();

    expect(montado.elemento.querySelector('app-chat-demanda-leitura')).toBeNull();
    expect(montado.elemento.querySelector('app-chat-minhas-demandas')).not.toBeNull();
  });

  it('com execução rodando a demanda dela abre sozinha, e voltar à lista não a reabre', async () => {
    const montado = await montarChat({ demandas: [{ ...RESUMO_DA_DEMANDA, executando: true }] });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/9'), DEMANDA_ABERTA);
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade'), { itens: [], totalItens: 0, paginaAtual: 1, itensPorPagina: 100, totalPaginas: 1 });
    await montado.atualizar();
    expect(montado.elemento.querySelector('app-chat-demanda-leitura')).not.toBeNull();

    montado.componente.voltarParaALista();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/demanda/executadas'), [{ ...RESUMO_DA_DEMANDA, executando: true }]);
    await montado.atualizar();

    expect(montado.elemento.querySelector('app-chat-minhas-demandas')).not.toBeNull();
    expect(montado.elemento.querySelector('app-chat-demanda-leitura')).toBeNull();
  });

  it('Planejar com a IA leva ao modo planejamento e a lista de demandas some', async () => {
    const montado = await montarChat({ demandas: [RESUMO_DA_DEMANDA] });
    await abrirDemandaNaLateral(montado);

    montado.componente.planejarComAIa();
    await montado.atualizar();
    for (const pedido of montado.http.match((requisicao) => requisicao.method === 'GET' && requisicao.url.endsWith('/plano'))) responderSucesso(pedido, []);
    for (const pedido of montado.http.match((requisicao) => requisicao.url.endsWith('/chat/conversas'))) responderSucesso(pedido, { conversas: [] });
    await montado.atualizar();

    expect(montado.componente.modo()).toBe(ModoDoChatEnum.PLANEJAMENTO);
    expect(montado.elemento.querySelector('app-chat-demanda-leitura')).toBeNull();
    expect(montado.elemento.querySelector('app-chat-minhas-demandas')).toBeNull();
  });
});

describe('ChatPage — mensagem inicial pelo link', () => {
  it('`?mensagem=` deixa o texto digitado no campo, sem enviar e com o foco', async () => {
    const montado = await montarChat({ consulta: { mensagem: 'De onde paramos?' } });
    await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
    await vi.waitFor(async () => {
      await montado.atualizar();
      expect(textoDoCampo(montado)).toBe('De onde paramos?');
      expect(document.activeElement).toBe(montado.elemento.querySelector('.ProseMirror'));
    });
    expect(montado.http.match((r) => r.method === 'POST')).toEqual([]);
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();
  });

  it('sem `?mensagem=` o campo começa vazio', async () => {
    const montado = await montarChat();
    await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
    expect(textoDoCampo(montado)).toBe('');
  });
});

describe('ChatPage — campo que escreve formatado (task 253)', () => {
  const campoDoEditor = (montado: Montado) => campoDeMensagem(montado.fixture);

  it('o campo é o editor formatado e a mensagem sai em Markdown', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    controlarFluxo(enviarMensagemEspiao, 1);
    await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
    expect(montado.elemento.querySelector('textarea')).toBeNull();

    campoDoEditor(montado).definirTexto('Isso é **importante** e `simples`');
    await montado.atualizar();
    teclarNaMensagem(montado.fixture, 'Enter');
    await montado.atualizar();

    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('Isso é **importante** e `simples`');
    expect(textoDoCampo(montado)).toBe('');
  });

  it('Shift+Enter abre um novo parágrafo em vez de enviar', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    await digitar(montado, 'primeira');
    const evento = teclarNaMensagem(montado.fixture, 'Enter', { shiftKey: true });
    expect(evento.defaultPrevented).toBe(true);
    campoDoEditor(montado).editor()!.inserirTexto('segunda');
    await montado.atualizar();

    expect(enviarMensagemEspiao).not.toHaveBeenCalled();
    expect(textoDoCampo(montado)).toBe('primeira\n\nsegunda');
  });

  it('em lista o Enter continua a lista e só o Ctrl+Enter envia', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    controlarFluxo(enviarMensagemEspiao, 1);
    await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
    campoDoEditor(montado).definirTexto('- um\n- dois');
    await montado.atualizar();

    teclarNaMensagem(montado.fixture, 'Enter');
    await montado.atualizar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();

    teclarNaMensagem(montado.fixture, 'Enter', { ctrlKey: true });
    await montado.atualizar();
    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
    // O Enter abriu um terceiro item (vazio), que o Ctrl+Enter leva junto: é o mesmo comportamento do campo do chat entre colaboradores.
    expect(enviarMensagemEspiao.mock.calls[0][0]).toMatch(/^- um\n- dois/);
  });

  it('Enter com texto só de espaços não envia', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    await digitar(montado, '   ');
    teclarNaMensagem(montado.fixture, 'Enter');
    await montado.atualizar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();
  });

  it('perto do limite aparece o contador e acima dele o envio fica bloqueado', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    await digitar(montado, 'a'.repeat(3300));
    expect(texto(montado)).toContain('3.300 / 4.000');
    expect(botaoEnviar(montado).disabled).toBe(false);

    await digitar(montado, 'a'.repeat(4001));
    expect(texto(montado)).toContain('Passou do limite da mensagem');
    expect(botaoEnviar(montado).disabled).toBe(true);
    teclarNaMensagem(montado.fixture, 'Enter');
    await montado.atualizar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();
  });

  it('a mensagem do usuário aparece formatada no histórico (o que foi escrito em negrito aparece em negrito)', async () => {
    const montado = await montarChat({ mensagens: [DELA('Terminei a **análise** e fiz:\n\n- revisão\n- testes'), DA_IA('Ótimo!')] });
    const balao = montado.elemento.querySelector('.chat__balao')!;
    expect(balao.querySelector('strong')?.textContent).toBe('análise');
    expect(balao.querySelectorAll('li').length).toBe(2);
    expect(balao.textContent).not.toContain('**');
  });

  it('no modo Planejamento o campo também é o editor formatado', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    montado.componente.modo.set(ModoDoChatEnum.PLANEJAMENTO);
    await montado.atualizar();
    await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
    expect(montado.elemento.querySelector('textarea')).toBeNull();
    expect(placeholderDoCampo(montado)).toBe('Abra um plano para conversar');
    expect(campoDesabilitado(montado)).toBe(true);
  });
});
