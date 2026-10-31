import { describe, it, expect, vi, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PontoDiaResumoDto, PontoDiarioDto, TipoUsuarioEnum } from '@project20/shared';
import { montarComponente as montarSemReinicio } from '../../../../../testes/montar-componente';
import { esperarRequisicao, responderSucesso } from '../../../../../testes/http-teste';
import { PontoMesDiaComponent } from './ponto-mes-dia.component';
import { dataParaIso } from '../../../execucao/utils/execucao.util';
import { hojeNoFuso } from '@project20/shared';
import { ambiente } from '../../../../../environments/environment';

const montarComponente: typeof montarSemReinicio = (componente, opcoes) => {
  TestBed.resetTestingModule();
  return montarSemReinicio(componente, opcoes);
};

afterEach(() => vi.useRealTimers());

const texto = (elemento: HTMLElement) => (elemento.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Data ISO `dias` dias a partir de hoje (negativo = passado), no dia do fuso do sistema, como o componente compara. */
const dataRelativa = (dias: number) => {
  const data = hojeNoFuso(ambiente.fusoHorario);
  data.setDate(data.getDate() + dias);
  return dataParaIso(data);
};

function dia(sobrescrita: Partial<PontoDiaResumoDto> = {}): PontoDiaResumoDto {
  return {
    data: '2026-03-02', ehDiaUtil: true, motivoNaoUtil: null, primeiroInicioData: null, ultimoFimData: null,
    totalMinutosTrabalhados: 0, saldoMinutos: -480, metaMinutos: 480, intervalos: [],
    justificativaNome: null, justificativaMinutosCobertos: null, ...sobrescrita,
  } as PontoDiaResumoDto;
}

const comRegistro = (sobrescrita: Partial<PontoDiaResumoDto> = {}) => dia({
  primeiroInicioData: new Date(2026, 2, 2, 9, 0), ultimoFimData: new Date(2026, 2, 2, 17, 0),
  totalMinutosTrabalhados: 420, saldoMinutos: -60, ...sobrescrita,
});

// Instante que no fuso do sistema (-03:00) marca h:m: os rótulos Manhã/Tarde/Noite não dependem do fuso da máquina que roda o teste.
const brt = (hora: number, minuto = 0) => new Date(Date.UTC(2026, 2, 2, hora + 3, minuto));
const intervalo = (inicio: [number, number], fim: [number, number]) => {
  const inicioData = brt(inicio[0], inicio[1]);
  const fimData = brt(fim[0], fim[1]);
  return { inicioData, fimData, duracaoMinutos: Math.round((fimData.getTime() - inicioData.getTime()) / 60000) };
};
const INTERVALO_DO_ALMOCO = [intervalo([12, 0], [13, 0])];
const COM_ALMOCO = { primeiroInicioData: brt(9), ultimoFimData: brt(17), intervalos: INTERVALO_DO_ALMOCO };

const montar = (valor: PontoDiaResumoDto, podeJustificar = false) =>
  montarComponente(PontoMesDiaComponent, {
    usuario: podeJustificar ? TipoUsuarioEnum.GESTOR : TipoUsuarioEnum.DESENVOLVEDOR,
    entradas: { dia: valor, usuarioId: 3, podeJustificar },
  });

describe('PontoMesDiaComponent: cabeçalho da linha', () => {
  it('dia útil com registro mostra dia da semana, número, período, total e saldo', async () => {
    const montado = await montar(comRegistro());
    expect(montado.elemento.querySelector('.ponto-mes-dia__semana')!.textContent).toBe('Seg');
    expect(montado.elemento.querySelector('.ponto-mes-dia__numero')!.textContent).toBe('2');
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__periodo') as HTMLElement)).toContain('09:00');
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__periodo') as HTMLElement)).toContain('17:00');
    expect(montado.elemento.querySelector('.ponto-mes-dia__total')!.textContent).toContain('7h');
    expect(montado.elemento.querySelector('.ponto-mes-dia__saldo--negativo')!.textContent!.trim()).toBe('-1h 0min');
  });

  it('dia útil sem registro mostra o travessão e saldo negativo da meta inteira', async () => {
    const montado = await montar(dia());
    expect(montado.elemento.querySelector('.ponto-mes-dia__vazio')).not.toBeNull();
    expect(montado.elemento.querySelector('.ponto-mes-dia__saldo--negativo')!.textContent!.trim()).toBe('-8h 0min');
    expect(montado.componente.temRegistro).toBe(false);
  });

  it('execução em andamento no dia mostra "em andamento" no lugar do fim', async () => {
    const montado = await montar(comRegistro({ ultimoFimData: null }));
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__periodo') as HTMLElement)).toContain('em andamento');
  });

  it('fim de semana (não útil) mostra o motivo, sem a marca de dia útil', async () => {
    const montado = await montar(dia({ data: '2026-03-07', ehDiaUtil: false, motivoNaoUtil: 'Fim de semana', metaMinutos: 0, saldoMinutos: 0 }));
    expect(montado.elemento.querySelector('.ponto-mes-dia--nao-util')).not.toBeNull();
    expect(montado.elemento.querySelector('.ponto-mes-dia__badge')!.textContent).toContain('Fim de semana');
    expect(montado.elemento.querySelector('.ponto-mes-dia__semana')!.textContent).toBe('Sáb');
  });

  it('meio período é não útil, mostra o motivo com "(meio período)" e a meta pela metade no tooltip', async () => {
    const montado = await montar(dia({
      ehDiaUtil: false, motivoNaoUtil: 'Ponto facultativo - Jogo (meio período)', metaMinutos: 240, saldoMinutos: -240,
    }));
    expect(montado.elemento.querySelector('.ponto-mes-dia--nao-util')).not.toBeNull();
    expect(montado.elemento.querySelector('.ponto-mes-dia__badge')!.textContent).toContain('(meio período)');
    expect(montado.componente.metaTooltip).toBe('Meta do dia: 4h 0min');
  });

  it('trabalho em dia não útil aparece como horas, com o período no lugar do motivo', async () => {
    const montado = await montar(comRegistro({ data: '2026-03-07', ehDiaUtil: false, motivoNaoUtil: 'Fim de semana', metaMinutos: 0, saldoMinutos: 420 }));
    expect(montado.elemento.querySelector('.ponto-mes-dia__badge')).toBeNull();
    expect(montado.elemento.querySelector('.ponto-mes-dia__saldo--positivo')!.textContent!.trim()).toBe('+7h 0min');
  });

  it('o dia de hoje recebe a marca de hoje', async () => {
    const hoje = await montar(dia({ data: dataRelativa(0) }));
    expect(hoje.componente.ehHoje).toBe(true);
    expect(hoje.elemento.querySelector('.ponto-mes-dia--hoje')).not.toBeNull();
    const ontem = await montar(dia({ data: dataRelativa(-1) }));
    expect(ontem.componente.ehHoje).toBe(false);
  });
});

describe('PontoMesDiaComponent: justificativa', () => {
  const justificada = (minutos: number) => dia({ justificativaNome: 'Consulta médica', justificativaMinutosCobertos: minutos, saldoMinutos: 0, metaMinutos: 480 - minutos });

  it('mostra o badge com o nome e descreve as horas descontadas da meta', async () => {
    const montado = await montar(justificada(210));
    expect(montado.elemento.querySelector('.ponto-mes-dia__badge--justificativa')!.textContent).toContain('Consulta médica');
    expect(montado.componente.justificativaTooltip).toBe('Consulta médica · 3h 30min descontadas da meta do dia');
  });

  it('formata a cobertura de forma compacta: 0h, minutos, horas cheias e horas com minutos', async () => {
    const formatar = async (minutos: number) => (await montar(justificada(minutos))).componente.justificativaCobertura;
    expect(await formatar(0)).toBe('0h');
    expect(await formatar(45)).toBe('45min');
    expect(await formatar(240)).toBe('4h');
    expect(await formatar(210)).toBe('3h 30min');
  });

  it('só o gestor tem o badge acionável; ao clicar pede o dialog e não expande a linha', async () => {
    const gestor = await montar(comRegistro({ justificativaNome: 'Atestado', justificativaMinutosCobertos: 60 }), true);
    const pedidos: PontoDiaResumoDto[] = [];
    gestor.componente.justificarSolicitada.subscribe((valor) => pedidos.push(valor));
    const badge = gestor.elemento.querySelector('.ponto-mes-dia__badge--justificativa') as HTMLElement;
    expect(badge.getAttribute('role')).toBe('button');
    badge.click();
    expect(pedidos).toHaveLength(1);
    expect(gestor.componente.expandido()).toBe(false);

    const desenvolvedor = await montar(dia({ justificativaNome: 'Atestado', justificativaMinutosCobertos: 60 }), false);
    const badgeDev = desenvolvedor.elemento.querySelector('.ponto-mes-dia__badge--justificativa') as HTMLElement;
    expect(badgeDev.getAttribute('role')).toBeNull();
    const pedidosDev: PontoDiaResumoDto[] = [];
    desenvolvedor.componente.justificarSolicitada.subscribe((valor) => pedidosDev.push(valor));
    badgeDev.click();
    expect(pedidosDev).toEqual([]);
  });

  it('"Justificar" só para o gestor, em dia útil já ocorrido, com déficit e sem justificativa', async () => {
    const passado = dataRelativa(-1);
    const botao = async (valor: PontoDiaResumoDto, gestor = true) =>
      (await montar(valor, gestor)).elemento.querySelector('.ponto-mes-dia__justificar');

    expect(await botao(dia({ data: passado }))).not.toBeNull();
    expect(await botao(dia({ data: dataRelativa(0) }))).not.toBeNull();
    expect(await botao(dia({ data: passado }), false)).toBeNull();
    expect(await botao(dia({ data: dataRelativa(1) }))).toBeNull();
    expect(await botao(dia({ data: passado, saldoMinutos: 0 }))).toBeNull();
    expect(await botao(dia({ data: passado, ehDiaUtil: false }))).toBeNull();
    expect(await botao(dia({ data: passado, justificativaNome: 'Já justificado', justificativaMinutosCobertos: 60 }))).toBeNull();
  });

  it('clicar em "Justificar" emite o dia e não expande a linha', async () => {
    const valor = dia({ data: dataRelativa(-1) });
    const montado = await montar(valor, true);
    const pedidos: PontoDiaResumoDto[] = [];
    montado.componente.justificarSolicitada.subscribe((item) => pedidos.push(item));
    (montado.elemento.querySelector('.ponto-mes-dia__justificar') as HTMLElement).click();
    expect(pedidos).toEqual([valor]);
    expect(montado.componente.expandido()).toBe(false);
  });
});

describe('PontoMesDiaComponent: expandir o dia', () => {
  const detalhe = (): PontoDiarioDto => ({
    data: '2026-03-02', usuarioId: 3, nomeUsuario: 'Ana', ehDiaUtil: true, motivoNaoUtil: null, metaMinutos: 480,
    minutosTrabalhadosDiaUtil: 420, minutosTrabalhadosExtra: 0, totalMinutosTrabalhados: 420, saldoMinutos: -60,
    intervalos: INTERVALO_DO_ALMOCO,
    execucoes: [{
      id: 1, atividadeId: 41, nomeAtividade: 'Atividade um', inicioData: brt(9), fimData: brt(12), duracaoMinutos: 180,
    } as never],
  });

  it('dia sem registro não expande nem consulta', async () => {
    const montado = await montar(dia());
    (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
    await montado.atualizar();
    expect(montado.componente.expandido()).toBe(false);
    montado.http.expectNone(() => true);
  });

  it('dia com registro consulta o diário do usuário uma vez e mostra os períodos com as execuções e os intervalos', async () => {
    const montado = await montar(comRegistro(COM_ALMOCO));
    (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
    await montado.atualizar();
    expect(montado.componente.carregando()).toBe(true);
    const requisicao = esperarRequisicao(montado.http, 'GET', '/ponto/diario');
    expect(requisicao.request.params.get('data')).toBe('2026-03-02');
    expect(requisicao.request.params.get('usuarioId')).toBe('3');
    responderSucesso(requisicao, detalhe());
    await montado.atualizar();

    expect(montado.componente.carregando()).toBe(false);
    expect(texto(montado.elemento)).toContain('Atividade um');
    expect(montado.elemento.querySelectorAll('.ponto-mes-dia__bloco')).toHaveLength(2);
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__bloco') as HTMLElement)).toContain('Manhã ·');
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__bloco') as HTMLElement)).toContain('Atividade um');
    expect(montado.elemento.querySelectorAll('.ponto-mes-dia__intervalo')).toHaveLength(1);
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__intervalo') as HTMLElement)).toContain('Intervalo ·');
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__intervalo') as HTMLElement)).toContain('1h 0min');

    // recolher e abrir de novo reaproveita o detalhe, sem nova consulta
    (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
    (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
    await montado.atualizar();
    montado.http.expectNone(() => true);
    expect(montado.componente.expandido()).toBe(true);
  });

  it('a atividade do detalhe é só texto: não há botão que a abra', async () => {
    const montado = await montar(comRegistro(COM_ALMOCO));
    (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/diario'), detalhe());
    await montado.atualizar();
    const atividade = montado.elemento.querySelector('.ponto-mes-dia__execucao-atividade') as HTMLElement;
    expect(atividade.tagName).toBe('DIV');
    expect(atividade.textContent).toContain('Atividade');
  });
});

const detalheVazio = (): PontoDiarioDto => ({
  data: '2026-03-02', usuarioId: 3, nomeUsuario: 'Ana', ehDiaUtil: true, motivoNaoUtil: null, metaMinutos: 480, minutosTrabalhadosDiaUtil: 0,
  minutosTrabalhadosExtra: 0, totalMinutosTrabalhados: 0, saldoMinutos: 0, intervalos: [], execucoes: [],
});

describe('PontoMesDiaComponent: resumo da linha (P-054)', () => {
  const linha = (montado: Awaited<ReturnType<typeof montar>>) => texto(montado.elemento.querySelector('.ponto-mes-dia__periodo') as HTMLElement);

  it('mostra um chip por período e por intervalo, sem abrir o detalhe', async () => {
    const montado = await montar(comRegistro({ primeiroInicioData: brt(8), ultimoFimData: brt(17, 50), intervalos: [intervalo([12, 15], [13, 15])] }));
    const rotulos = Array.from(montado.elemento.querySelectorAll('.ponto-mes-dia__chip-rotulo')).map((rotulo) => texto(rotulo as HTMLElement));
    expect(rotulos).toEqual(['Manhã', 'Intervalo', 'Tarde']);
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__chip--intervalo') as HTMLElement)).toBe('Intervalo 1h 0min');
    montado.http.expectNone(() => true);
  });

  it('vários períodos e intervalos ganham número', async () => {
    const montado = await montar(comRegistro({
      primeiroInicioData: brt(8), ultimoFimData: brt(17, 20),
      intervalos: [intervalo([10, 0], [10, 15]), intervalo([12, 30], [13, 30]), intervalo([15, 10], [15, 25])],
    }));
    expect(linha(montado)).toContain('Manhã 1');
    expect(linha(montado)).toContain('Manhã 2');
    expect(linha(montado)).toContain('Tarde 2');
    expect(linha(montado)).toContain('1º intervalo');
    expect(linha(montado)).toContain('3º intervalo');
  });

  it('a cor do intervalo por faixa só aparece no detalhe (1h verde, 50 min amarelo, 40 min laranja, 20 min vermelho); na linha é a cor do tema', async () => {
    const faixas = async (duracaoMinutos: number) => {
      const fim: [number, number] = [12 + Math.floor(duracaoMinutos / 60), duracaoMinutos % 60];
      const montado = await montar(comRegistro({ intervalos: [intervalo([12, 0], fim)] }));
      expect(montado.elemento.querySelector('.ponto-mes-dia__chip--intervalo')!.className).not.toContain('faixa');
      (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
      responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/diario'), { ...detalheVazio(), intervalos: [intervalo([12, 0], fim)] });
      await montado.atualizar();
      return montado.elemento.querySelector('.ponto-mes-dia__intervalo')!.className;
    };
    expect(await faixas(60)).toContain('ponto-mes-dia__faixa--esperado');
    expect(await faixas(50)).toContain('ponto-mes-dia__faixa--atencao');
    expect(await faixas(40)).toContain('ponto-mes-dia__faixa--alerta');
    expect(await faixas(20)).toContain('ponto-mes-dia__faixa--critico');
  });

  it('dia útil encerrado, com hora a menos e sem justificativa, mostra o alerta "Faltaram"', async () => {
    const montado = await montar(comRegistro({ data: dataRelativa(-3), totalMinutosTrabalhados: 400, saldoMinutos: -80 }));
    const alerta = montado.elemento.querySelector('.ponto-mes-dia__alerta--aviso') as HTMLElement;
    expect(texto(alerta)).toBe('Faltaram 1h 20min');
  });

  it('o dia de hoje, o dia justificado e o dia sem falta relevante não alertam hora a menos', async () => {
    const hoje = await montar(comRegistro({ data: dataRelativa(0), totalMinutosTrabalhados: 400, saldoMinutos: -80 }));
    expect(hoje.elemento.querySelector('.ponto-mes-dia__alerta')).toBeNull();
    const justificado = await montar(comRegistro({ data: dataRelativa(-3), saldoMinutos: -80, justificativaNome: 'Atestado', justificativaMinutosCobertos: 480 }));
    expect(justificado.elemento.querySelector('.ponto-mes-dia__alerta')).toBeNull();
    const tolerancia = await montar(comRegistro({ data: dataRelativa(-3), totalMinutosTrabalhados: 470, saldoMinutos: -10 }));
    expect(tolerancia.elemento.querySelector('.ponto-mes-dia__alerta')).toBeNull();
  });

  it('mais de 10h trabalhadas mostra o alerta de erro, inclusive hoje', async () => {
    const montado = await montar(comRegistro({ data: dataRelativa(0), totalMinutosTrabalhados: 670, saldoMinutos: 190 }));
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__alerta--erro') as HTMLElement)).toBe('Acima de 10h (+1h 10min)');
  });

  it('ao abrir o dia com alerta, o detalhe explica o alerta', async () => {
    const montado = await montar(comRegistro({ data: dataRelativa(-3), totalMinutosTrabalhados: 400, saldoMinutos: -80 }));
    (montado.elemento.querySelector('.ponto-mes-dia__linha') as HTMLElement).click();
    responderSucesso(esperarRequisicao(montado.http, 'GET', '/ponto/diario'), {
      data: '2026-03-02', usuarioId: 3, nomeUsuario: 'Ana', ehDiaUtil: true, motivoNaoUtil: null, metaMinutos: 480, minutosTrabalhadosDiaUtil: 400,
      minutosTrabalhadosExtra: 0, totalMinutosTrabalhados: 400, saldoMinutos: -80, intervalos: [], execucoes: [],
    });
    await montado.atualizar();
    expect(texto(montado.elemento.querySelector('.ponto-mes-dia__aviso') as HTMLElement)).toContain('sem justificativa');
  });
});
