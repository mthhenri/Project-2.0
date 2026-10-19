import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AutorChatEnum, ChatEventoDto, ChatMensagemResumoDto, ContextoChatEnum, NivelIaEnum } from '@project20/shared';
import { esperarRequisicao, responderSucesso } from '../../../../testes/http-teste';
import { SEM_OVERLAY_GLOBAL } from '../../../core/interceptors/loading.interceptor';
import { ChatService, ErroDoChat } from './chat.service';

// Chat (SYSTEM.SPEC.md §12 "chat"): o envio é `POST` com resposta `text/event-stream` lida por `fetch`
// (EventSource só faz GET e não leva o cabeçalho de autorização). As leituras (hoje, conversas, conversa, busca) usam HttpClient.

const mensagemFinal: ChatMensagemResumoDto = {
  id: 'm-1', conversaId: '1-2026-10-19', usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.IA, texto: 'Oi!',
  nivel: NivelIaEnum.RAPIDO, modelo: 'modelo', tokensEntrada: 1, tokensSaida: 1, assunto: null, tokensCache: null, propostaId: null, execucaoId: null,
  atividadeId: null, demandaId: null, createdDate: new Date('2026-10-19T12:00:00.000Z'),
};

const evento = (dados: ChatEventoDto) => `data: ${JSON.stringify(dados)}\n\n`;
const codificador = new TextEncoder();

/** Um `Response` cujo corpo entrega cada pedaço (texto ou bytes) numa leitura separada. */
function respostaEmPedacos(pedacos: (string | Uint8Array)[], init: ResponseInit = { status: 200 }): Response {
  const corpo = new ReadableStream<Uint8Array>({
    start(controle) {
      for (const pedaco of pedacos) controle.enqueue(typeof pedaco === 'string' ? codificador.encode(pedaco) : pedaco);
      controle.close();
    },
  });
  return new Response(corpo, { headers: { 'Content-Type': 'text/event-stream' }, ...init });
}

function coletar() {
  const eventos: ChatEventoDto[] = [];
  return { eventos, aoEvento: (recebido: ChatEventoDto) => eventos.push(recebido) };
}

describe('ChatService — envio e leitura do fluxo', () => {
  let servico: ChatService;
  let fetchFalso: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(ChatService);
    fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('envia um POST JSON para /chat/mensagem, pedindo event-stream e levando o token de acesso', async () => {
    localStorage.setItem('access_token', 'token-123');
    fetchFalso.mockResolvedValue(respostaEmPedacos([]));

    await servico.enviarMensagem('bom dia', () => undefined);

    const [url, opcoes] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/chat/mensagem');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.body).toBe(JSON.stringify({ texto: 'bom dia' }));
    expect(opcoes.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: 'Bearer token-123' });
  });

  it('sem token guardado, não manda o cabeçalho Authorization', async () => {
    fetchFalso.mockResolvedValue(respostaEmPedacos([]));

    await servico.enviarMensagem('oi', () => undefined);

    const opcoes = fetchFalso.mock.calls[0][1] as RequestInit;
    expect(opcoes.headers).not.toHaveProperty('Authorization');
  });

  it('o check-in usa o mesmo envio em outra rota (caminho informado)', async () => {
    fetchFalso.mockResolvedValue(respostaEmPedacos([]));

    await servico.enviarMensagem('estou no login', () => undefined, undefined, '/checkin/mensagem');

    expect(fetchFalso.mock.calls[0][0]).toBe('/api/v1/checkin/mensagem');
  });

  it('entrega cada evento na ordem em que chegam: trecho, ferramenta, proposta, fim e sugestões', async () => {
    const { eventos, aoEvento } = coletar();
    fetchFalso.mockResolvedValue(
      respostaEmPedacos([
        evento({ tipo: 'trecho', texto: 'Vou ' }),
        evento({ tipo: 'ferramenta', nome: 'consultar_atividades', situacao: 'EXECUTANDO' }),
        evento({ tipo: 'ferramenta', nome: 'consultar_atividades', situacao: 'CONCLUIDA' }),
        evento({ tipo: 'proposta', propostaId: 9 }),
        evento({ tipo: 'trecho', texto: 'ver.' }),
        evento({ tipo: 'fim', mensagem: mensagemFinal }),
        evento({ tipo: 'sugestoes', itens: ['Sim', 'Não'] }),
      ]),
    );

    await servico.enviarMensagem('o que tenho?', aoEvento);

    expect(eventos.map((recebido) => recebido.tipo)).toEqual(['trecho', 'ferramenta', 'ferramenta', 'proposta', 'trecho', 'fim', 'sugestoes']);
    expect(eventos[3]).toEqual({ tipo: 'proposta', propostaId: 9 });
    expect(eventos[6]).toEqual({ tipo: 'sugestoes', itens: ['Sim', 'Não'] });
  });

  it('um evento cortado no meio entre duas leituras só é entregue quando completo', async () => {
    const { eventos, aoEvento } = coletar();
    const inteiro = evento({ tipo: 'trecho', texto: 'olá mundo' });
    const corte = Math.floor(inteiro.length / 2);
    fetchFalso.mockResolvedValue(
      respostaEmPedacos([inteiro.slice(0, corte), inteiro.slice(corte), evento({ tipo: 'erro', mensagem: 'falhou' })]),
    );

    await servico.enviarMensagem('oi', aoEvento);

    expect(eventos).toEqual([
      { tipo: 'trecho', texto: 'olá mundo' },
      { tipo: 'erro', mensagem: 'falhou' },
    ]);
  });

  it('o separador de eventos partido entre leituras não perde nem duplica eventos', async () => {
    const { eventos, aoEvento } = coletar();
    const texto = JSON.stringify({ tipo: 'trecho', texto: 'a' });
    fetchFalso.mockResolvedValue(respostaEmPedacos([`data: ${texto}\n`, `\ndata: ${texto}\n`, '\n']));

    await servico.enviarMensagem('oi', aoEvento);

    expect(eventos).toHaveLength(2);
  });

  it('um caractere multibyte partido entre duas leituras chega inteiro', async () => {
    const { eventos, aoEvento } = coletar();
    const bytes = codificador.encode(evento({ tipo: 'trecho', texto: 'ação é ótima' }));
    const posicaoDoCedilha = bytes.indexOf(0xc3); // primeiro byte de "ç"
    fetchFalso.mockResolvedValue(respostaEmPedacos([bytes.slice(0, posicaoDoCedilha + 1), bytes.slice(posicaoDoCedilha + 1)]));

    await servico.enviarMensagem('oi', aoEvento);

    expect(eventos).toEqual([{ tipo: 'trecho', texto: 'ação é ótima' }]);
  });

  it('um evento malformado é ignorado e o fluxo segue com os seguintes', async () => {
    const { eventos, aoEvento } = coletar();
    fetchFalso.mockResolvedValue(respostaEmPedacos(['data: {quebrado\n\n', evento({ tipo: 'trecho', texto: 'ok' })]));

    await servico.enviarMensagem('oi', aoEvento);

    expect(eventos).toEqual([{ tipo: 'trecho', texto: 'ok' }]);
  });

  it('o fluxo que acaba sem fim nem erro termina sem lançar (a tela é quem avisa a queda)', async () => {
    const { eventos, aoEvento } = coletar();
    fetchFalso.mockResolvedValue(respostaEmPedacos([evento({ tipo: 'trecho', texto: 'parcial' })]));

    await expect(servico.enviarMensagem('oi', aoEvento)).resolves.toBeUndefined();
    expect(eventos.map((recebido) => recebido.tipo)).toEqual(['trecho']);
  });

  it('o servidor recusar antes do fluxo (409) lança ErroDoChat com a mensagem e o status do corpo', async () => {
    fetchFalso.mockResolvedValue(
      new Response(JSON.stringify({ sucesso: false, mensagem: 'A IA está desligada.' }), { status: 409, headers: { 'Content-Type': 'application/json' } }),
    );
    const { eventos, aoEvento } = coletar();

    const falha = await servico.enviarMensagem('oi', aoEvento).catch((erro: unknown) => erro);

    expect(falha).toBeInstanceOf(ErroDoChat);
    expect(falha).toMatchObject({ mensagem: 'A IA está desligada.', status: 409 });
    expect(eventos).toEqual([]);
  });

  it('erro HTTP sem corpo JSON cai na mensagem padrão, mantendo o status', async () => {
    fetchFalso.mockResolvedValue(new Response('<html>502</html>', { status: 502 }));

    const falha = await servico.enviarMensagem('oi', () => undefined).catch((erro: unknown) => erro);

    expect(falha).toMatchObject({ mensagem: 'Não foi possível enviar a mensagem.', status: 502 });
  });

  it('resposta 200 sem corpo legível também vira ErroDoChat', async () => {
    fetchFalso.mockResolvedValue(new Response(null, { status: 200 }));

    const falha = await servico.enviarMensagem('oi', () => undefined).catch((erro: unknown) => erro);

    expect(falha).toBeInstanceOf(ErroDoChat);
  });

  it('sem rede (fetch rejeita), lança ErroDoChat de status 0 com aviso de conexão', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));

    const falha = await servico.enviarMensagem('oi', () => undefined).catch((erro: unknown) => erro);

    expect(falha).toBeInstanceOf(ErroDoChat);
    expect(falha).toMatchObject({ mensagem: 'Sem conexão com o servidor. Tente de novo.', status: 0 });
  });

  it('cancelar pelo sinal interrompe a leitura: os eventos já lidos ficam entregues e a promessa rejeita', async () => {
    const controle = new AbortController();
    const { eventos, aoEvento } = coletar();
    fetchFalso.mockImplementation((_url: string, opcoes: RequestInit) => {
      const corpo = new ReadableStream<Uint8Array>({
        start(fluxo) {
          fluxo.enqueue(codificador.encode(evento({ tipo: 'trecho', texto: 'primeiro' })));
          opcoes.signal?.addEventListener('abort', () => fluxo.error(new DOMException('Abortado', 'AbortError')));
        },
      });
      return Promise.resolve(new Response(corpo, { status: 200 }));
    });

    const promessa = servico.enviarMensagem('oi', aoEvento, controle.signal);
    await vi.waitFor(() => expect(eventos).toHaveLength(1));
    controle.abort();

    await expect(promessa).rejects.toMatchObject({ name: 'AbortError' });
    expect(eventos).toEqual([{ tipo: 'trecho', texto: 'primeiro' }]);
    expect((fetchFalso.mock.calls[0][1] as RequestInit).signal).toBe(controle.signal);
  });

  it('o bom dia é um POST em /chat/bom-dia sem corpo, lendo o fluxo como o envio', async () => {
    localStorage.setItem('access_token', 't');
    const { eventos, aoEvento } = coletar();
    fetchFalso.mockResolvedValue(respostaEmPedacos([evento({ tipo: 'fim', mensagem: mensagemFinal })]));

    await servico.iniciarBomDia(aoEvento);

    const [url, opcoes] = fetchFalso.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/chat/bom-dia');
    expect(opcoes.method).toBe('POST');
    expect(opcoes.body).toBeUndefined();
    expect(opcoes.headers).toMatchObject({ Accept: 'text/event-stream', Authorization: 'Bearer t' });
    expect(eventos.map((recebido) => recebido.tipo)).toEqual(['fim']);
  });

  it('a retomada é um POST em /chat/retomada; 409 (nada a retomar) vira ErroDoChat', async () => {
    fetchFalso.mockResolvedValue(new Response(JSON.stringify({ mensagem: 'Sem conversa hoje.' }), { status: 409 }));

    const falha = await servico.iniciarRetomada(() => undefined).catch((erro: unknown) => erro);

    expect(fetchFalso.mock.calls[0][0]).toBe('/api/v1/chat/retomada');
    expect(falha).toMatchObject({ mensagem: 'Sem conversa hoje.', status: 409 });
  });

  it('bom dia sem rede lança ErroDoChat de status 0', async () => {
    fetchFalso.mockRejectedValue(new TypeError('Failed to fetch'));

    const falha = await servico.iniciarBomDia(() => undefined).catch((erro: unknown) => erro);

    expect(falha).toMatchObject({ status: 0 });
  });
});

describe('ChatService — leituras pelo HttpClient', () => {
  let servico: ChatService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servico = TestBed.inject(ChatService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('recupera hoje, a lista de conversas e a conversa de um dia pelos caminhos do contrato', () => {
    servico.recuperarHoje().subscribe();
    responderSucesso(esperarRequisicao(http, 'GET', '/chat/hoje'), { conversaId: '1-2026-10-19', mensagens: [] });
    servico.listarConversas().subscribe();
    responderSucesso(esperarRequisicao(http, 'GET', '/chat/conversas'), { conversas: [] });
    servico.recuperarConversa('2026-10-18').subscribe();
    responderSucesso(esperarRequisicao(http, 'GET', '/chat/conversa/2026-10-18'), { conversaId: '1-2026-10-18', mensagens: [] });
  });

  it('renomear a conversa é um PUT em /chat/conversa/<data>/titulo com o título no corpo, sem overlay global', () => {
    servico.alterarTituloConversa('2026-10-19', 'Planejando').subscribe();

    const requisicao = esperarRequisicao(http, 'PUT', '/chat/conversa/2026-10-19/titulo');
    expect(requisicao.request.body).toEqual({ titulo: 'Planejando' });
    expect(requisicao.request.context.get(SEM_OVERLAY_GLOBAL)).toBe(true);
    responderSucesso(requisicao, { conversaId: '1-2026-10-19', titulo: 'Planejando', tituloEditado: true });
  });

  it('a busca manda o texto como parâmetro de consulta', () => {
    servico.buscar('prazo & acordo').subscribe();

    const requisicao = esperarRequisicao(http, 'GET', '/chat/busca');
    expect(requisicao.request.params.get('texto')).toBe('prazo & acordo');
    responderSucesso(requisicao, { mensagens: [] });
  });
});
