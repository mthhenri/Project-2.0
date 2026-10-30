import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AutorChatEnum, ChatEventoDto, CheckinSituacaoConsultadaDto, ContextoChatEnum, EstadoIaEnum, NivelIaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { campoDeMensagem, digitarNaMensagem, esperarCampoDeMensagem, teclarNaMensagem, textoDaMensagem } from '../../../../../testes/campo-mensagem';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { ChatService, ErroDoChat } from '../../../chat/services/chat.service';
import { CheckinPage } from './checkin.page';

// Janela do check-in (SYSTEM.SPEC.md §12 "checkin", tasks 151/160/161): layout próprio, execução com duração, conversa com a IA por stream
// (ChatService.enviarMensagem na rota /checkin/mensagem; 409 sem execução em andamento), conferência da situação a cada 3 s e fim da janela
// quando a descrição é registrada ou os check-ins são suspensos. O envio é um dublê controlável; as leituras passam pelo HttpTestingController.

type Montado = ComponenteMontado<CheckinPage>;

interface OpcoesSituacao {
  execucaoId?: number | null;
  suspenso?: boolean;
  motivo?: string | null;
  minutos?: number;
  acima?: boolean;
}

function situacao(opcoes: OpcoesSituacao = {}): CheckinSituacaoConsultadaDto {
  const execucaoId = opcoes.execucaoId === undefined ? 5 : opcoes.execucaoId;
  return {
    haCheckin: execucaoId !== null,
    execucao: execucaoId === null ? null : {
      id: execucaoId, atividade: 'Tela de login', demanda: 'Autenticação', projeto: 'Project 2.0', descricao: 'trabalhando',
      inicio: new Date('2026-10-19T12:00:00.000Z'), minutos: opcoes.minutos ?? 45,
    },
    suspensao: { suspenso: opcoes.suspenso ?? false, desde: null, motivo: opcoes.motivo ?? null },
    checkinMinimoMinutos: 30,
    checkinMaximoMinutos: 80,
    duracaoRecomendadaMinutos: 90,
    rigorProporcional: true,
    acimaDoRecomendado: opcoes.acima ?? false,
    proximoCheckinData: null,
    disparado: true,
  };
}

function mensagemDaIa(texto: string, sobrescrita: Record<string, unknown> = {}) {
  return {
    id: `m-${texto}`, conversaId: '1-2026-10-19', usuarioId: 1, contexto: ContextoChatEnum.CHECKIN, autor: AutorChatEnum.IA, texto,
    nivel: NivelIaEnum.RAPIDO, modelo: null, tokensEntrada: null, tokensSaida: null, assunto: null, tokensCache: null, propostaIds: [],
    execucaoId: null, atividadeId: null, demandaId: null, createdDate: '2026-10-19T12:00:00.000Z', ...sobrescrita,
  };
}

interface OpcoesMontagem {
  situacao?: CheckinSituacaoConsultadaDto;
  ia?: EstadoIaEnum;
  embutido?: boolean;
  /** Troca os temporizadores pelos simulados antes de a situação chegar (os da página nascem na resposta). */
  temporizadoresSimulados?: boolean;
}

/** Monta a página e responde o que ela pede ao abrir: estado da IA e situação do check-in. */
async function montarCheckin(opcoes: OpcoesMontagem = {}): Promise<Montado> {
  const montado = await montarComponente(CheckinPage, {
    usuario: TipoUsuarioEnum.DESENVOLVEDOR,
    entradas: opcoes.embutido ? { embutido: true } : {},
  });
  if (opcoes.temporizadoresSimulados) vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: opcoes.ia ?? EstadoIaEnum.NO_AR });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), opcoes.situacao ?? situacao());
  await montado.atualizar();
  return montado;
}

/** Responde as conferências de situação pendentes (o envio e a recusa deixam algumas). */
function responderSituacoes(montado: Montado, resposta: CheckinSituacaoConsultadaDto = situacao()): number {
  const pedidos = montado.http.match((requisicao) => requisicao.url.endsWith('/checkin/situacao'));
  for (const pedido of pedidos) responderSucesso(pedido, resposta);
  return pedidos.length;
}

/** Dublê de uma chamada de stream: o teste empurra os eventos e decide quando e como a chamada termina. */
function controlarFluxo(espiao: ReturnType<typeof vi.spyOn>) {
  let aoEvento: (evento: ChatEventoDto) => void = () => undefined;
  let terminar: () => void = () => undefined;
  let falhar: (erro: unknown) => void = () => undefined;
  espiao.mockImplementation(((...argumentos: unknown[]) =>
    new Promise<void>((resolver, rejeitar) => {
      aoEvento = argumentos[1] as (evento: ChatEventoDto) => void;
      terminar = resolver;
      falhar = rejeitar;
    })) as never);
  return {
    emitir: (evento: ChatEventoDto) => aoEvento(evento),
    terminar: () => terminar(),
    falhar: (erro: unknown) => falhar(erro),
  };
}

const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const conversaDa = (montado: Montado) => montado.elemento.querySelector('[aria-label="Conversa do check-in"]')?.textContent ?? '';
const textoDoCampo = (montado: Montado) => textoDaMensagem(montado.fixture);
const campoDesabilitado = (montado: Montado) => campoDeMensagem(montado.fixture).desabilitado();
const botaoEnviar = (montado: Montado) => montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Enviar"]')!;
/** O botão pelo texto ou pelo rótulo de acessibilidade (os ícones da linha compacta da proposta). */
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo || candidato.getAttribute('aria-label') === rotulo);
const sugestoesVisiveis = (montado: Montado) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('[aria-label="Sugestões de resposta"] button')).map((item) => item.textContent?.trim());
const avisosDe = (montado: Montado) => {
  const avisos: { severity?: string; summary?: string; detail?: string }[] = [];
  montado.mensagens.messageObserver.subscribe((recebido) => avisos.push(...[recebido].flat()));
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
  teclarNaMensagem(montado.fixture, 'Enter');
  await montado.atualizar();
}

let enviarMensagemEspiao: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  enviarMensagemEspiao = vi.spyOn(ChatService.prototype, 'enviarMensagem').mockResolvedValue();
});

afterEach(() => {
  vi.useRealTimers();
  TestBed.inject(DesfazerService).dispensarSemEncerrar();
  delete (window as unknown as { projectDesktop?: unknown }).projectDesktop;
  vi.restoreAllMocks();
});

describe('CheckinPage — abrir a janela', () => {
  it('mostra o esqueleto enquanto carrega e, ao chegar, a execução com a duração e a abertura da IA', async () => {
    const montado = await montarComponente(CheckinPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(montado.elemento.querySelector('[aria-label="Conversa do check-in"]')).toBeNull();

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao());
    await montado.atualizar();

    expect(montado.elemento.querySelector('[aria-busy="true"]')).toBeNull();
    expect(texto(montado)).toContain('Hora do check-in');
    expect(texto(montado)).toContain('Tela de login · Autenticação');
    expect(texto(montado)).toContain('45 min');
    expect(texto(montado)).not.toContain('acima do recomendado');
    expect(conversaDa(montado)).toContain('Hora do check-in em Tela de login.');
    expect(conversaDa(montado)).toContain('Já faz 45 min. Conte do seu jeito o que você fez.');
  });

  it('execução acima da duração recomendada: destaca a duração e pede mais detalhe', async () => {
    const montado = await montarCheckin({ situacao: situacao({ minutos: 135, acima: true }) });

    expect(texto(montado)).toContain('2h15');
    expect(texto(montado)).toContain('acima do recomendado');
    expect(conversaDa(montado)).toContain('mais do que o recomendado (1h30): conte com um pouco mais de detalhe.');
  });

  it('o check-in da página é o layout próprio: sem menu e com o toast da janela', async () => {
    const montado = await montarCheckin();

    expect(montado.elemento.querySelector('app-toast-desfazer')).not.toBeNull();
    expect(montado.elemento.querySelector('p-toast')).not.toBeNull();
    expect(montado.elemento.classList.contains('checkin-embutido')).toBe(false);
    expect(montado.elemento.querySelector('nav')).toBeNull();
  });

  it('falha ao carregar mostra o erro e "Tentar de novo" pede a situação outra vez', async () => {
    const montado = await montarComponente(CheckinPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    esperarRequisicao(montado.http, 'GET', '/checkin/situacao').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();

    expect(texto(montado)).toContain('Não foi possível carregar o check-in.');
    expect(montado.elemento.querySelector('[role="alert"]')).not.toBeNull();
    botao(montado, 'Tentar de novo')!.click();
    await montado.atualizar();
    expect(montado.elemento.querySelector('[aria-busy="true"]')).not.toBeNull();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao());
    await montado.atualizar();

    expect(texto(montado)).not.toContain('Não foi possível carregar o check-in.');
    expect(conversaDa(montado)).toContain('Hora do check-in em Tela de login.');
  });

  it('resposta sem dados também é erro de carga', async () => {
    const montado = await montarComponente(CheckinPage, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), null);
    await montado.atualizar();

    expect(texto(montado)).toContain('Não foi possível carregar o check-in.');
  });
});

describe('CheckinPage — estados sem conversa', () => {
  it('sem execução em andamento: explica, não oferece campo e o botão Fechar volta ao sistema', async () => {
    // O temporizador de 5 s da janela nasce na resposta: simulado, para o teste não esperá-lo (nem a estabilização do Angular).
    const montado = await montarCheckin({ situacao: situacao({ execucaoId: null }), temporizadoresSimulados: true });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fecharJanela = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    expect(texto(montado)).toContain('Não há check-in agora');
    expect(texto(montado)).toContain('Você não tem execução em andamento.');
    expect(montado.elemento.querySelector('[aria-label="Resposta do check-in"]')).toBeNull();
    botao(montado, 'Fechar')!.click();
    expect(fecharJanela).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(150);

    expect(navegar).toHaveBeenCalledWith('/chat');
  });

  it('sem execução em andamento, a janela se fecha sozinha depois de 5 s', async () => {
    const montado = await montarCheckin({ situacao: situacao({ execucaoId: null }), temporizadoresSimulados: true });
    const fechar = vi.spyOn(montado.componente, 'fechar').mockImplementation(() => undefined);

    vi.advanceTimersByTime(4900);
    expect(fechar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);

    expect(fechar).toHaveBeenCalledTimes(1);
  });

  it('suspenso (reunião): mostra o motivo e libera a janela', async () => {
    const montado = await montarCheckin({ situacao: situacao({ suspenso: true, motivo: 'Em reunião' }) });

    expect(texto(montado)).toContain('Check-ins suspensos');
    expect(texto(montado)).toContain('Em reunião.');
    expect(texto(montado)).toContain('Eles voltam quando você voltar (ou amanhã).');
    expect(montado.elemento.querySelector('[aria-label="Resposta do check-in"]')).toBeNull();
    expect(botao(montado, 'Fechar')).toBeDefined();
  });

  it('suspenso sem motivo: só a explicação', async () => {
    const montado = await montarCheckin({ situacao: situacao({ suspenso: true }) });

    expect(texto(montado)).toContain('Check-ins suspensos');
    expect(texto(montado)).not.toContain('null');
    expect(texto(montado)).not.toContain('undefined');
  });

  it('IA desligada: não há conversa; "Ir para Atividades" leva ao fallback', async () => {
    const montado = await montarCheckin({ ia: EstadoIaEnum.DESLIGADA });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(texto(montado)).toContain('A IA está indisponível');
    expect(montado.elemento.querySelector('[aria-label="Resposta do check-in"]')).toBeNull();
    botao(montado, 'Ir para Atividades')!.click();
    expect(navegar).toHaveBeenCalledWith('/atividade');
  });

  it('IA fora do ar também mostra o estado indisponível', async () => {
    const montado = await montarCheckin({ ia: EstadoIaEnum.FORA_DO_AR });

    expect(texto(montado)).toContain('A IA está indisponível');
  });
});

describe('CheckinPage — conversa', () => {
  it('o clique no botão Enviar envia a resposta (P-018)', async () => {
    const montado = await montarCheckin();
    controlarFluxo(enviarMensagemEspiao);
    await digitar(montado, 'Terminei o formulário de login');

    botaoEnviar(montado).dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await montado.atualizar();

    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('Terminei o formulário de login');
    expect(textoDoCampo(montado)).toBe('');
  });


  it('o botão Enviar só vale com texto; ao enviar chama o stream do check-in e a mensagem aparece na hora', async () => {
    const montado = await montarCheckin();
    expect(botaoEnviar(montado).disabled).toBe(true);
    await digitar(montado, '   ');
    expect(botaoEnviar(montado).disabled).toBe(true);
    controlarFluxo(enviarMensagemEspiao);

    await enviarPeloTeclado(montado, '  Terminei o formulário de login  ');

    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
    const argumentos = enviarMensagemEspiao.mock.calls[0];
    expect(argumentos[0]).toBe('Terminei o formulário de login');
    expect(argumentos[2]).toBeUndefined();
    expect(argumentos[3]).toBe('/checkin/mensagem');
    expect(conversaDa(montado)).toContain('Terminei o formulário de login');
    expect(textoDoCampo(montado)).toBe('');
  });

  it('envia e apresenta a mensagem formatada como no chat', async () => {
    const montado = await montarCheckin();
    controlarFluxo(enviarMensagemEspiao);
    await esperarCampoDeMensagem(montado.fixture, montado.atualizar);
    campoDeMensagem(montado.fixture).definirTexto('**Feito** hoje');
    await montado.atualizar();
    botaoEnviar(montado).click();
    await montado.atualizar();
    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('**Feito** hoje');
    expect(montado.elemento.querySelector('.checkin__balao strong')?.textContent).toBe('Feito');
  });

  it('mantém o limite de 4.000 caracteres e impede envio acima dele', async () => {
    const montado = await montarCheckin();
    await digitar(montado, 'a'.repeat(4001));
    expect(botaoEnviar(montado).disabled).toBe(true);
    expect(texto(montado)).toContain('Passou do limite da mensagem');
    await montado.componente.enviar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();
  });

  it('Enter envia; Shift+Enter não envia (quebra a linha)', async () => {
    const montado = await montarCheckin();
    controlarFluxo(enviarMensagemEspiao);
    await digitar(montado, 'oi');

    teclarNaMensagem(montado.fixture, 'Enter', { shiftKey: true });
    await montado.atualizar();
    expect(enviarMensagemEspiao).not.toHaveBeenCalled();

    teclarNaMensagem(montado.fixture, 'Enter');
    await montado.atualizar();
    expect(enviarMensagemEspiao).toHaveBeenCalledTimes(1);
  });

  it('pensando, trechos acumulados e, no fim, a resposta vira mensagem da IA; o campo trava durante a resposta e volta depois', async () => {
    const montado = await montarCheckin();
    const fluxo = controlarFluxo(enviarMensagemEspiao);

    await enviarPeloTeclado(montado, 'Terminei o login');
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).not.toBeNull();
    expect(botaoEnviar(montado).disabled).toBe(true);
    expect(campoDesabilitado(montado)).toBe(true);

    fluxo.emitir({ tipo: 'trecho', texto: 'Entendi, ' });
    montado.fixture.detectChanges();
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).toBeNull();
    fluxo.emitir({ tipo: 'trecho', texto: 'registro a descrição.' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('Entendi, registro a descrição.');

    fluxo.emitir({ tipo: 'fim', mensagem: mensagemDaIa('Entendi, registro a descrição.') as never });
    fluxo.terminar();
    await montado.atualizar();

    expect(montado.elemento.querySelector('.checkin__ia-conteudo[aria-busy="true"]')).toBeNull();
    expect(conversaDa(montado).match(/Entendi, registro a descrição\./g)).toHaveLength(1);
    expect(campoDesabilitado(montado)).toBe(false);
    // Ao terminar, confere a situação (a descrição pode ter sido confirmada).
    expect(responderSituacoes(montado)).toBe(1);
  });

  it('ferramenta executando mostra "consultando"; ao concluir, o aviso some', async () => {
    const montado = await montarCheckin();
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Fiz o ponto de hoje');

    fluxo.emitir({ tipo: 'ferramenta', nome: 'consultar_execucao_ativa', situacao: 'EXECUTANDO' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('consultando');
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).toBeNull();

    fluxo.emitir({ tipo: 'ferramenta', nome: 'consultar_execucao_ativa', situacao: 'CONCLUIDA' });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).not.toContain('consultando');

    fluxo.terminar();
    await montado.atualizar();
  });

  it('evento de proposta mostra o cartão da proposta e o mantém, sem duplicar, depois do fim', async () => {
    const montado = await montarCheckin();
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Criei a tela de login');

    fluxo.emitir({ tipo: 'proposta', propostaId: 31 });
    montado.fixture.detectChanges();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/atividade-prioridade'), []);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/proposta-ia/31'), {
      id: 31, usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, status: StatusPropostaIaEnum.PENDENTE,
      dados: { nome: 'Tela de login', prioridade: 'INDEFINIDA' }, resultado: null, resolucaoData: null, createdDate: '2026-10-19T12:00:00.000Z',
    });
    montado.fixture.detectChanges();
    expect(conversaDa(montado)).toContain('Tela de login');
    expect(botao(montado, 'Confirmar')).toBeDefined();
    const cartaoAoVivo = montado.elemento.querySelector('app-chat-proposta-cartao');

    fluxo.emitir({ tipo: 'fim', mensagem: mensagemDaIa('Posso registrar?', { propostaIds: [31] }) as never });
    fluxo.terminar();
    await montado.atualizar();

    // A proposta que chegou ao vivo e a que vem na mensagem final são a mesma: um cartão só.
    expect(montado.elemento.querySelectorAll('app-chat-proposta-cartao')).toHaveLength(1);
    // E não é recriado no fim (P-035): é o mesmo elemento, sem piscar em "Carregando proposta…".
    expect(montado.elemento.querySelector('app-chat-proposta-cartao')).toBe(cartaoAoVivo);
    responderSituacoes(montado);
  });

  it('evento de erro mostra o aviso e encerra a resposta ao vivo; o campo volta a aceitar texto', async () => {
    const montado = await montarCheckin();
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Terminei');

    fluxo.emitir({ tipo: 'erro', mensagem: 'A IA não conseguiu responder agora.' });
    fluxo.terminar();
    await montado.atualizar();

    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', summary: 'Check-in', detail: 'A IA não conseguiu responder agora.' })]);
    expect(montado.elemento.querySelector('[aria-label="A IA está pensando"]')).toBeNull();
    expect(campoDesabilitado(montado)).toBe(false);
    responderSituacoes(montado);
  });

  it('o fluxo que acaba sem fim nem erro (conexão caiu) avisa que foi interrompido', async () => {
    const montado = await montarCheckin();
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Oi');

    fluxo.emitir({ tipo: 'trecho', texto: 'Vou ver' });
    fluxo.terminar();
    await montado.atualizar();

    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', detail: 'A conexão foi interrompida antes do fim da resposta.' })]);
    responderSituacoes(montado);
  });

  it('recusa 409 (sem execução em andamento): tira a mensagem, devolve o texto, avisa e confere a situação', async () => {
    const montado = await montarCheckin();
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Terminei a tarefa');

    fluxo.falhar(new ErroDoChat('Você não tem execução em andamento.', 409));
    await montado.atualizar();

    expect(conversaDa(montado)).not.toContain('Terminei a tarefa');
    expect(textoDoCampo(montado)).toBe('Terminei a tarefa');
    expect(avisos).toEqual([expect.objectContaining({ severity: 'info', summary: 'Check-in', detail: 'Você não tem execução em andamento.' })]);
    // A execução acabou: a conferência leva a janela para "registrado" (já havia execução na abertura).
    expect(responderSituacoes(montado, situacao({ execucaoId: null }))).toBeGreaterThanOrEqual(1);
    await montado.atualizar();
    expect(texto(montado)).toContain('Check-in registrado');
  });

  it('falha de conexão antes do fluxo avisa com severidade de alerta e devolve o texto, sem conferir como no 409', async () => {
    const montado = await montarCheckin();
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Oi de novo');

    fluxo.falhar(new ErroDoChat('Sem conexão com o servidor. Tente de novo.', 0));
    await montado.atualizar();

    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', detail: 'Sem conexão com o servidor. Tente de novo.' })]);
    expect(textoDoCampo(montado)).toBe('Oi de novo');
    // Só a conferência do fim do envio (não a extra do 409).
    expect(responderSituacoes(montado)).toBe(1);
  });

  it('recusa sem mensagem do servidor usa o texto padrão', async () => {
    const montado = await montarCheckin();
    const avisos = avisosDe(montado);
    const fluxo = controlarFluxo(enviarMensagemEspiao);
    await enviarPeloTeclado(montado, 'Oi');

    fluxo.falhar({ status: 500 });
    await montado.atualizar();

    expect(avisos).toEqual([expect.objectContaining({ severity: 'warn', detail: 'Não foi possível enviar a mensagem' })]);
    responderSituacoes(montado);
  });
});

describe('CheckinPage — sugestões', () => {
  it('com o campo vazio oferece as sugestões; clicar numa envia o texto como resposta', async () => {
    const montado = await montarCheckin();
    expect(sugestoesVisiveis(montado)).toEqual(['Terminei o que estava fazendo', 'Vou trocar de atividade', 'Vou entrar numa reunião']);
    controlarFluxo(enviarMensagemEspiao);

    montado.elemento.querySelector<HTMLButtonElement>('[aria-label="Sugestões de resposta"] button')!.click();
    await montado.atualizar();

    expect(enviarMensagemEspiao.mock.calls[0][0]).toBe('Terminei o que estava fazendo');
    expect(enviarMensagemEspiao.mock.calls[0][3]).toBe('/checkin/mensagem');
    expect(conversaDa(montado)).toContain('Terminei o que estava fazendo');
    expect(sugestoesVisiveis(montado)).toEqual([]);
  });

  it('as sugestões somem enquanto o usuário digita', async () => {
    const montado = await montarCheckin();

    await digitar(montado, 'algo');

    expect(sugestoesVisiveis(montado)).toEqual([]);
  });
});

describe('CheckinPage — conferência da situação', () => {
  it('a cada 3 s confere a situação; com a mesma execução, segue em conversa', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/checkin/situacao'));

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ minutos: 48 }));
    await montado.atualizar();

    expect(texto(montado)).toContain('48 min');
    expect(montado.elemento.querySelector('app-editor-mensagem')).not.toBeNull();

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ minutos: 51 }));
  });

  it('execução trocada (descrição confirmada) vira "Check-in registrado" e a conferência para', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ execucaoId: 6 }));
    await montado.atualizar();

    expect(texto(montado)).toContain('Check-in registrado');
    expect(texto(montado)).toContain('A descrição foi registrada.');
    expect(montado.elemento.querySelector('[aria-label="Resposta do check-in"]')).toBeNull();
    vi.advanceTimersByTime(9000);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/checkin/situacao'));
  });

  it('suspensão por reunião durante a conversa libera a janela', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ suspenso: true, motivo: 'Reunião de equipe' }));
    await montado.atualizar();

    expect(texto(montado)).toContain('Check-ins suspensos');
    expect(texto(montado)).toContain('Reunião de equipe.');
  });

  it('execução pausada durante a conversa também é "registrada" (a janela é liberada)', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ execucaoId: null }));
    await montado.atualizar();

    expect(texto(montado)).toContain('Check-in registrado');
  });

  it('falha numa conferência não derruba a conversa nem a conferência seguinte (o aviso é só o do interceptor de erros)', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });
    const avisos = avisosDe(montado);

    vi.advanceTimersByTime(3000);
    esperarRequisicao(montado.http, 'GET', '/checkin/situacao').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();

    expect(montado.elemento.querySelector('app-editor-mensagem')).not.toBeNull();
    expect(avisos.some((aviso) => aviso.summary === 'Check-in')).toBe(false);
    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao());
  });

  it('sem execução ao abrir não há conferência periódica', async () => {
    const montado = await montarCheckin({ situacao: situacao({ execucaoId: null }), temporizadoresSimulados: true });

    vi.advanceTimersByTime(3000);
    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/checkin/situacao'));
  });

  it('ao destruir a página a conferência para', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });

    montado.fixture.destroy();
    vi.advanceTimersByTime(9000);

    montado.http.expectNone((requisicao) => requisicao.url.endsWith('/checkin/situacao'));
  });
});

describe('CheckinPage — fechar', () => {
  it('embutida (diálogo do Project): não tem toast próprio e avisa "encerrado" em vez de fechar a janela', async () => {
    const montado = await montarCheckin({ situacao: situacao({ suspenso: true }), embutido: true });
    const encerrado = vi.fn();
    montado.componente.encerrado.subscribe(encerrado);
    const fecharJanela = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    expect(montado.elemento.classList.contains('checkin-embutido')).toBe(true);
    expect(montado.elemento.querySelector('p-toast')).toBeNull();
    expect(montado.elemento.querySelector('app-toast-desfazer')).toBeNull();
    botao(montado, 'Fechar')!.click();

    expect(encerrado).toHaveBeenCalledTimes(1);
    expect(fecharJanela).not.toHaveBeenCalled();
  });

  it('embutida: depois de registrar, a confirmação some sozinha em 2,5 s', async () => {
    const montado = await montarCheckin({ embutido: true, temporizadoresSimulados: true });
    const encerrado = vi.fn();
    montado.componente.encerrado.subscribe(encerrado);

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ execucaoId: 6 }));
    await montado.atualizar();
    expect(texto(montado)).toContain('Check-in registrado');
    vi.advanceTimersByTime(2400);
    expect(encerrado).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);

    expect(encerrado).toHaveBeenCalledTimes(1);
  });

  it('janela própria (não embutida) no navegador: o registrado não some sozinho', async () => {
    const montado = await montarCheckin({ temporizadoresSimulados: true });
    const fechar = vi.spyOn(montado.componente, 'fechar').mockImplementation(() => undefined);

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ execucaoId: 6 }));
    await montado.atualizar();
    vi.advanceTimersByTime(10_000);

    expect(texto(montado)).toContain('Check-in registrado');
    expect(fechar).not.toHaveBeenCalled();
  });

  it('no Project Desktop: avisa o desktop para fechar a janela (sem window.close) e o registrado some sozinho', async () => {
    const encerrarCheckin = vi.fn();
    (window as unknown as { projectDesktop: unknown }).projectDesktop = { encerrarCheckin };
    const fecharJanela = vi.spyOn(window, 'close').mockImplementation(() => undefined);
    const montado = await montarCheckin({ temporizadoresSimulados: true });
    expect(montado.elemento.classList.contains('checkin-no-desktop')).toBe(true);

    vi.advanceTimersByTime(3000);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ execucaoId: 6 }));
    await montado.atualizar();
    vi.advanceTimersByTime(2600);

    expect(encerrarCheckin).toHaveBeenCalledTimes(1);
    expect(fecharJanela).not.toHaveBeenCalled();
  });

  it('no navegador comum o Fechar fecha a janela e, se ela continua aberta, volta ao chat', async () => {
    const montado = await montarCheckin({ situacao: situacao({ suspenso: true }) });
    const fecharJanela = vi.spyOn(window, 'close').mockImplementation(() => undefined);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    vi.useFakeTimers({ toFake: ['setTimeout'] });

    botao(montado, 'Fechar')!.click();
    expect(fecharJanela).toHaveBeenCalledTimes(1);
    expect(navegar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);

    expect(navegar).toHaveBeenCalledWith('/chat');
  });
});
