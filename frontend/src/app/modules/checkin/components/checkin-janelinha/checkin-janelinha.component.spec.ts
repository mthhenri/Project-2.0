import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { CheckinSituacaoConsultadaDto, EstadoIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente, ComponenteMontado } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { CheckinJanelinhaComponent } from './checkin-janelinha.component';

// Janelinha do check-in dentro do Project (SYSTEM.SPEC.md §12 "checkin", task 161): quando o backend diz que o horário chegou (`disparado`),
// há execução e os check-ins não estão suspensos, mostra a tela do check-in num diálogo central; com a IA desligada ou fora do ar não
// trava a tela. A regra pura está em `checkin.util.test.ts`; aqui vale o comportamento: consultas, horário sorteado, diálogo e encerramento.

type Montado = ComponenteMontado<CheckinJanelinhaComponent>;

function situacao(parcial: Partial<CheckinSituacaoConsultadaDto> & { execucaoId?: number | null; suspenso?: boolean } = {}): CheckinSituacaoConsultadaDto {
  const execucaoId = parcial.execucaoId === undefined ? 5 : parcial.execucaoId;
  return {
    haCheckin: execucaoId !== null,
    execucao: execucaoId === null ? null : {
      id: execucaoId, atividade: 'Tela de login', demanda: 'Autenticação', projeto: 'Project 2.0', descricao: 'trabalhando',
      inicio: new Date('2026-10-19T12:00:00.000Z'), minutos: 45,
    },
    suspensao: { suspenso: parcial.suspenso ?? false, desde: null, motivo: null },
    checkinMinimoMinutos: 30,
    checkinMaximoMinutos: 80,
    duracaoRecomendadaMinutos: 90,
    rigorProporcional: true,
    acimaDoRecomendado: false,
    proximoCheckinData: parcial.proximoCheckinData ?? null,
    disparado: parcial.disparado ?? true,
  };
}

const URL_SITUACAO = (requisicao: { url: string }) => requisicao.url.endsWith('/checkin/situacao');
const URL_IA = (requisicao: { url: string }) => requisicao.url.endsWith('/ia/disponibilidade');

interface OpcoesMontagem {
  situacao?: CheckinSituacaoConsultadaDto;
  ia?: EstadoIaEnum;
}

/** Monta a janelinha e responde as duas leituras que ela faz ao abrir (estado da IA e situação do check-in). */
async function montarJanelinha(opcoes: OpcoesMontagem = {}): Promise<Montado> {
  const montado = await montarSemSituacao();
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: opcoes.ia ?? EstadoIaEnum.NO_AR });
  responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), opcoes.situacao ?? situacao());
  await montado.atualizar();
  return montado;
}

/** O `@defer` do template exige resolver os metadados do componente antes de criá-lo (o `montarComponente` não o faz). */
async function montarSemSituacao(): Promise<Montado> {
  TestBed.configureTestingModule({ imports: [CheckinJanelinhaComponent] });
  await TestBed.compileComponents();
  // O `setInterval` de 20 s do componente é uma tarefa pendente do zone.js e `whenStable` esperaria por ele: temporizadores simulados desde o início.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  return montarComponente(CheckinJanelinhaComponent, { usuario: TipoUsuarioEnum.DESENVOLVEDOR });
}

/** O diálogo carrega a página do check-in num `@defer`, que pede o estado da IA e a situação ao nascer: responde as duas. */
async function responderPaginaEmbutida(montado: Montado, resposta: CheckinSituacaoConsultadaDto = situacao(), ia = EstadoIaEnum.NO_AR): Promise<void> {
  await montado.atualizar();
  for (const pedido of montado.http.match(URL_IA)) responderSucesso(pedido, { estado: ia });
  for (const pedido of montado.http.match(URL_SITUACAO)) responderSucesso(pedido, resposta);
  await montado.atualizar();
}

const dialogo = (montado: Montado) => montado.elemento.querySelector('[role="dialog"][aria-label="Hora do check-in"]');
const texto = (montado: Montado) => montado.elemento.textContent ?? '';
const botao = (montado: Montado, rotulo: string) =>
  Array.from(montado.elemento.querySelectorAll<HTMLButtonElement>('button')).find((candidato) => candidato.textContent?.trim() === rotulo);

afterEach(() => {
  vi.useRealTimers();
  TestBed.inject(DesfazerService).dispensarSemEncerrar();
  vi.restoreAllMocks();
});

describe('CheckinJanelinhaComponent — quando aparece', () => {
  it('ao abrir pede o estado da IA e a situação; sem horário disparado, nada aparece', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false }) });

    expect(dialogo(montado)).toBeNull();
    expect(texto(montado).trim()).toBe('');
  });

  it('horário disparado, com execução e sem suspensão: mostra o diálogo central com a tela do check-in embutida', async () => {
    const montado = await montarJanelinha();
    await responderPaginaEmbutida(montado);

    const caixa = dialogo(montado)!;
    expect(caixa).not.toBeNull();
    expect(caixa.getAttribute('aria-modal')).toBe('true');
    expect(montado.elemento.querySelector('.checkin-janelinha')).not.toBeNull();
    const pagina = montado.elemento.querySelector('app-checkin-page')!;
    expect(pagina.classList.contains('checkin-embutido')).toBe(true);
    expect(pagina.textContent).toContain('Tela de login · Autenticação');
    expect(pagina.textContent).toContain('Hora do check-in em Tela de login.');
    // Dentro do Project o layout tem os toasts: a página embutida não leva os dela.
    expect(pagina.querySelector('p-toast')).toBeNull();
  });

  it('não tem botão de fechar do diálogo: só some quando o check-in se resolve', async () => {
    const montado = await montarJanelinha();
    await responderPaginaEmbutida(montado);

    expect(botao(montado, 'Fechar')).toBeUndefined();
    expect(montado.elemento.querySelector('[aria-label="Fechar"]')).toBeNull();
  });

  it('check-ins suspensos (reunião): não aparece', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ suspenso: true }) });

    expect(dialogo(montado)).toBeNull();
  });

  it('sem execução em andamento: não aparece', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ execucaoId: null }) });

    expect(dialogo(montado)).toBeNull();
  });

  it.each([EstadoIaEnum.DESLIGADA, EstadoIaEnum.FORA_DO_AR])('IA %s: o horário disparou, mas a janelinha não trava a tela', async (estado) => {
    const montado = await montarJanelinha({ ia: estado });

    expect(dialogo(montado)).toBeNull();
    montado.http.expectNone(URL_SITUACAO);
  });

  it('falha ao consultar a situação é silenciosa: nenhum diálogo e nenhuma tela quebrada', async () => {
    const montado = await montarSemSituacao();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    esperarRequisicao(montado.http, 'GET', '/checkin/situacao').flush({ mensagem: 'falhou' }, { status: 500, statusText: 'Erro' });
    await montado.atualizar();

    expect(dialogo(montado)).toBeNull();
  });

  it('resposta sem dados não mostra o diálogo', async () => {
    const montado = await montarSemSituacao();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ia/disponibilidade'), { estado: EstadoIaEnum.NO_AR });
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), null);
    await montado.atualizar();

    expect(dialogo(montado)).toBeNull();
  });
});

describe('CheckinJanelinhaComponent — o horário sorteado pelo backend', () => {
  it('antes do horário não aparece; quando o horário chega, confere de novo e o diálogo aparece na hora', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false, proximoCheckinData: new Date(Date.now() + 200) }) });
    expect(dialogo(montado)).toBeNull();
    montado.http.expectNone(URL_SITUACAO);

    // O horário (200 ms) mais a folga de 500 ms da janelinha.
    vi.advanceTimersByTime(600);
    montado.http.expectNone(URL_SITUACAO);
    vi.advanceTimersByTime(200);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ disparado: true }));
    await montado.atualizar();

    expect(dialogo(montado)).not.toBeNull();
    await responderPaginaEmbutida(montado);
  });

  it('horário já passado: confere logo (espera zero mais a folga)', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false, proximoCheckinData: new Date(Date.now() - 60_000) }) });

    vi.advanceTimersByTime(499);
    montado.http.expectNone(URL_SITUACAO);
    vi.advanceTimersByTime(2);

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ disparado: false }));
  });
});

describe('CheckinJanelinhaComponent — conferência periódica', () => {
  it('a cada 20 s confere a situação enquanto não há diálogo', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false }) });

    vi.advanceTimersByTime(19_900);
    montado.http.expectNone(URL_SITUACAO);
    vi.advanceTimersByTime(200);
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ disparado: true }));
    await montado.atualizar();

    expect(dialogo(montado)).not.toBeNull();
    await responderPaginaEmbutida(montado);
  });

  it('com o diálogo aberto, a janelinha não confere (quem confere é a tela do check-in)', async () => {
    const montado = await montarJanelinha();
    await responderPaginaEmbutida(montado);

    vi.advanceTimersByTime(25_000);
    document.dispatchEvent(new Event('visibilitychange'));

    // Só as 8 conferências de 3 s da própria página embutida; a de 20 s e a de visibilidade da janelinha não pedem nada.
    expect(dialogo(montado)).not.toBeNull();
    expect(montado.http.match(URL_SITUACAO)).toHaveLength(8);
  });

  it('ao voltar para a aba (visibilitychange visível) confere na hora', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false }) });
    montado.http.expectNone(URL_SITUACAO);

    document.dispatchEvent(new Event('visibilitychange'));

    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ disparado: false }));
  });

  it('aba oculta não confere', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false }) });
    const visibilidade = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    document.dispatchEvent(new Event('visibilitychange'));

    montado.http.expectNone(URL_SITUACAO);
    visibilidade.mockRestore();
  });

  it('ao destruir a janelinha, a conferência periódica e o ouvinte de visibilidade são removidos', async () => {
    const montado = await montarJanelinha({ situacao: situacao({ disparado: false }) });

    montado.fixture.destroy();
    vi.advanceTimersByTime(60_000);
    document.dispatchEvent(new Event('visibilitychange'));

    montado.http.expectNone(URL_SITUACAO);
  });
});

describe('CheckinJanelinhaComponent — encerrar', () => {
  it('o check-in resolvido (suspenso pela tela) fecha o diálogo e confere a situação para o próximo horário', async () => {
    const montado = await montarJanelinha();
    await responderPaginaEmbutida(montado, situacao({ suspenso: true }));
    expect(dialogo(montado)).not.toBeNull();
    expect(texto(montado)).toContain('Check-ins suspensos');

    botao(montado, 'Fechar')!.click();
    await montado.atualizar();

    expect(dialogo(montado)).toBeNull();
    // O diálogo fechou e a janelinha pergunta de novo ao backend; a situação ainda diz "disparado", mas está suspensa: segue fechada.
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ suspenso: true }));
    await montado.atualizar();
    expect(dialogo(montado)).toBeNull();
  });

  it('depois de encerrar, o próximo disparo do backend reabre o diálogo', async () => {
    const montado = await montarJanelinha();
    await responderPaginaEmbutida(montado, situacao({ suspenso: true }));
    botao(montado, 'Fechar')!.click();
    await montado.atualizar();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/checkin/situacao'), situacao({ disparado: true, execucaoId: 7 }));
    await montado.atualizar();

    expect(dialogo(montado)).not.toBeNull();
    await responderPaginaEmbutida(montado, situacao({ execucaoId: 7 }));
    expect(texto(montado)).toContain('Hora do check-in em Tela de login.');
  });
});
