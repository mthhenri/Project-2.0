import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AutorChatEnum, ChatEventoDto, ContextoChatEnum, EstadoIaEnum, NivelIaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { ChatService, ErroDoChat } from '../../services/chat.service';
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
    assunto: null, tokensCache: null, propostaId: null, execucaoId: null, atividadeId: null, demandaId: null,
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
}

/** Monta a página e responde o que ela pede ao abrir: estado da IA, conversa de hoje e lista do histórico. */
async function montarChat(opcoes: OpcoesMontagem = {}): Promise<Montado> {
  const montado = await montarComponente(ChatPage, { usuario: opcoes.usuario ?? TipoUsuarioEnum.DESENVOLVEDOR });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: opcoes.mensagens ?? [] });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/conversas'), { conversas: opcoes.conversas ?? [] });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: opcoes.estado ?? EstadoIaEnum.NO_AR });
  await montado.atualizar();
  return montado;
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
const campo = (montado: Montado) => montado.elemento.querySelector<HTMLTextAreaElement>('[aria-label="Mensagem para a IA"]')!;
const botaoEnviar = (montado: Montado) => montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Enviar"]')!;
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo);
const sugestoesVisiveis = (montado: Montado) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Sugestões de mensagem"] button')).map((item) => item.textContent?.trim());
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((mensagemRecebida) => avisos.push(...[mensagemRecebida].flat()));
  return avisos;
};

async function digitar(montado: Montado, conteudo: string) {
  campo(montado).value = conteudo;
  campo(montado).dispatchEvent(new Event('input'));
  await montado.atualizar();
}

async function enviarPeloTeclado(montado: Montado, conteudo: string) {
  await digitar(montado, conteudo);
  expect(botaoEnviar(montado).disabled).toBe(false);
  // Pelo Enter: o `(ngSubmit)` do formulário não dispara (ver o it.todo P-018 do botão Enviar).
  campo(montado).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
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
    expect(montado.elemento.querySelector('[aria-label="Nível usado: analítico"]')).not.toBeNull();
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
  // Divergência: o formulário do campo (`<form (ngSubmit)="enviar()">`) não tem `[formGroup]` nem `FormsModule`, então `ngSubmit`
  // nunca dispara; o clique no botão Enviar (type="submit") não chama `enviar()` (só o Enter e as sugestões enviam).
  it.todo('P-018: o clique no botão Enviar envia a mensagem (hoje o ngSubmit do formulário não dispara: chat.page.html <form (ngSubmit)>)');

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
    expect(campo(montado).value).toBe('');
  });

  it('Enter envia; Shift+Enter não envia (quebra a linha)', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    controlarFluxo(enviarMensagemEspiao, 1);
    await digitar(montado, 'oi');

    campo(montado).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true }));
    await montado.atualizar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();

    campo(montado).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    await montado.atualizar();
    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
  });

  it('enquanto a resposta não traz texto mostra "pensando"; os trechos vão se acumulando; no fim vira uma mensagem da IA', async () => {
    const montado = await montarChat({ mensagens: [DA_IA('Olá!')] });
    const fluxo = controlarFluxo(enviarMensagemEspiao, 1);

    await enviarPeloTeclado(montado, 'Como está meu dia?');
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).not.toBeNull();
    expect(botaoEnviar(montado).disabled).toBe(true);
    expect(campo(montado).disabled).toBe(true);

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
    expect(campo(montado).disabled).toBe(false);
    // O fim relê o estado da IA e a lista do histórico (a conversa pode ter ganhado nome).
    expect(montado.http.match((requisicao) => requisicao.url.endsWith('/ia/disponibilidade'))).toHaveLength(1);
    expect(montado.http.match((requisicao) => requisicao.url.endsWith('/chat/conversas'))).toHaveLength(1);
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

  it('resolver o cartão (Confirmar) troca os botões de sugestão pelos próximos passos da proposta', async () => {
    const montado = await montarChat({
      mensagens: [DA_IA('Posso criar?', { propostaId: 31 })],
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
    expect(campo(montado).value).toBe('');
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
    expect(campo(montado).value).toBe('Pergunta importante');
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
    expect(campo(montado).value).toBe('Oi de novo');
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
    expect(campo(montado).disabled).toBe(true);
    expect(campo(montado).placeholder).toBe('A IA está desligada');
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
    expect(campo(montado).disabled).toBe(false);
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
    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('aside button')).find((item) => item.textContent?.includes('Conversa de ontem'))!.click();
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

    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('aside button')).find((item) => item.textContent?.includes('Conversa de hoje'))!.click();
    await montado.atualizar();

    montado.http.expectNone((requisicao) => requisicao.url.includes('/chat/conversa/'));
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/hoje'), { conversaId: CONVERSA_DE_HOJE, mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')] });
  });

  it('falha ao abrir o dia avisa e mantém a conversa de hoje', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')], conversas: CONVERSAS });
    const avisos = avisosDe(montado);

    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('aside button')).find((item) => item.textContent?.includes('Conversa de ontem'))!.click();
    esperarRequisicao(montado.http, 'GET', `/chat/conversa/${ONTEM}`).flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();

    expect(avisos).toContainEqual(expect.objectContaining({ severity: 'warn', detail: 'Não foi possível abrir essa conversa' }));
    expect(conversaDa(montado)).toContain('Olá de hoje!');
  });

  it('um resultado da busca abre o dia da mensagem e rola até ela', async () => {
    const montado = await montarChat({ mensagens: [DELA('Oi de hoje'), DA_IA('Olá de hoje!')], conversas: CONVERSAS });
    const campoBusca = montado.elemento.querySelector<HTMLInputElement>('[aria-label="Buscar nas minhas conversas"]')!;
    campoBusca.value = 'ontem';
    campoBusca.dispatchEvent(new Event('input'));
    campoBusca.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await montado.atualizar();
    const achada = DELA('Falei ontem', { id: 'm-achada', conversaId: `1-${ONTEM}` });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/chat/busca'), { mensagens: [achada] });
    await montado.atualizar();

    Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('aside li button'))[0].click();
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
