import { describe, it } from 'vitest';
import * as assert from 'node:assert/strict';
import { abreviacaoDiaSemana, alertasDoDia, descricaoDaFaixa, faixaDoIntervalo, formatarSaldoMinutos, montarSegmentosDoDia, numeroDoDia } from './ponto.model';

describe('ponto.model', () => {
  it('formatarSaldoMinutos: sinal explícito, e zero conta como positivo', () => {
    assert.equal(formatarSaldoMinutos(90), '+1h 30min');
    assert.equal(formatarSaldoMinutos(0), '+0h 0min');
    assert.equal(formatarSaldoMinutos(-45), '-0h 45min');
    assert.equal(formatarSaldoMinutos(-125), '-2h 5min');
  });

  it('abreviacaoDiaSemana: usa o calendário UTC da data ISO, sem deslocar pelo fuso', () => {
    assert.equal(abreviacaoDiaSemana('2026-03-02'), 'Seg');
    assert.equal(abreviacaoDiaSemana('2026-03-07'), 'Sáb');
    assert.equal(abreviacaoDiaSemana('2026-03-08'), 'Dom');
  });

  it('numeroDoDia: o dia do mês da data ISO', () => {
    assert.equal(numeroDoDia('2026-03-02'), 2);
    assert.equal(numeroDoDia('2026-12-31'), 31);
  });
});

describe('ponto.model: linha do dia (P-054)', () => {
  const FUSO = 'America/Sao_Paulo';
  // Instante que no fuso do sistema (-03:00) marca h:m, qualquer que seja o fuso da máquina que roda o teste.
  const hora = (h: number, m = 0) => new Date(Date.UTC(2026, 2, 2, h + 3, m));
  const intervalo = (inicio: Date, fim: Date) => ({ inicioData: inicio, fimData: fim, duracaoMinutos: Math.round((fim.getTime() - inicio.getTime()) / 60000) });

  it('faixaDoIntervalo: verde de 1h a 1h30; cada 15 min de desvio sobe uma faixa, nos dois sentidos', () => {
    const faixas: Array<[number, string]> = [
      [60, 'ESPERADO'], [75, 'ESPERADO'], [90, 'ESPERADO'],
      [59, 'ATENCAO'], [45, 'ATENCAO'], [91, 'ATENCAO'], [105, 'ATENCAO'],
      [44, 'ALERTA'], [30, 'ALERTA'], [106, 'ALERTA'], [120, 'ALERTA'],
      [29, 'CRITICO'], [15, 'CRITICO'], [121, 'CRITICO'], [240, 'CRITICO'],
    ];
    for (const [minutos, faixa] of faixas) assert.equal(faixaDoIntervalo(minutos), faixa, `${minutos} min`);
  });

  it('descricaoDaFaixa: cada faixa tem texto próprio', () => {
    const textos = (['ESPERADO', 'ATENCAO', 'ALERTA', 'CRITICO'] as const).map(descricaoDaFaixa);
    assert.equal(new Set(textos).size, 4);
  });

  it('segmentos: sem intervalo é um "Dia todo"; sem registro, nada', () => {
    const dia = { primeiroInicioData: hora(9), ultimoFimData: hora(17), intervalos: [] };
    assert.deepEqual(montarSegmentosDoDia(dia, FUSO).map((s) => [s.tipo, s.rotulo]), [['PERIODO', 'Dia todo']]);
    assert.deepEqual(montarSegmentosDoDia({ primeiroInicioData: null, ultimoFimData: null, intervalos: [] }, FUSO), []);
  });

  it('segmentos: um intervalo divide em Manhã e Tarde e leva a faixa pela duração', () => {
    const segmentos = montarSegmentosDoDia({ primeiroInicioData: hora(8), ultimoFimData: hora(17, 50), intervalos: [intervalo(hora(12, 15), hora(13, 15))] }, FUSO);
    assert.deepEqual(segmentos.map((s) => [s.tipo, s.rotulo]), [['PERIODO', 'Manhã'], ['INTERVALO', 'Intervalo'], ['PERIODO', 'Tarde']]);
    assert.equal(segmentos[1].faixa, 'ESPERADO');
    assert.equal(segmentos[1].duracaoMinutos, 60);
    assert.deepEqual([segmentos[0].inicioData, segmentos[0].fimData], [hora(8), hora(12, 15)]);
    assert.deepEqual([segmentos[2].inicioData, segmentos[2].fimData], [hora(13, 15), hora(17, 50)]);
  });

  it('segmentos: períodos de mesmo nome ganham número e os intervalos passam a "Nº intervalo"', () => {
    const segmentos = montarSegmentosDoDia({
      primeiroInicioData: hora(8), ultimoFimData: hora(17, 20),
      intervalos: [intervalo(hora(10), hora(10, 15)), intervalo(hora(12, 30), hora(13, 30)), intervalo(hora(15, 10), hora(15, 25))],
    }, FUSO);
    assert.deepEqual(segmentos.map((s) => s.rotulo), ['Manhã 1', '1º intervalo', 'Manhã 2', '2º intervalo', 'Tarde 1', '3º intervalo', 'Tarde 2']);
    assert.deepEqual(segmentos.filter((s) => s.tipo === 'INTERVALO').map((s) => s.faixa), ['CRITICO', 'ESPERADO', 'CRITICO']);
  });

  it('segmentos: execução em andamento deixa o último período sem fim; período a partir das 18h é Noite; intervalos fora de ordem são ordenados', () => {
    const emAndamento = montarSegmentosDoDia({ primeiroInicioData: hora(8), ultimoFimData: null, intervalos: [intervalo(hora(12), hora(13))] }, FUSO);
    assert.equal(emAndamento[2].fimData, null);
    const noite = montarSegmentosDoDia({ primeiroInicioData: hora(8), ultimoFimData: hora(21), intervalos: [intervalo(hora(18), hora(19)), intervalo(hora(12), hora(13))] }, FUSO);
    assert.deepEqual(noite.filter((s) => s.tipo === 'PERIODO').map((s) => s.rotulo), ['Manhã', 'Tarde', 'Noite']);
  });

  const dia = (parcial: Record<string, unknown> = {}) => ({
    data: '2026-03-02', ehDiaUtil: true, totalMinutosTrabalhados: 480, saldoMinutos: 0, metaMinutos: 480, justificativaNome: null, ...parcial,
  }) as Parameters<typeof alertasDoDia>[0];

  it('alertas: dia útil encerrado com mais de 10 min abaixo da meta e sem justificativa avisa "Faltaram"', () => {
    const alertas = alertasDoDia(dia({ totalMinutosTrabalhados: 400, saldoMinutos: -80 }), '2026-03-03');
    assert.deepEqual(alertas.map((a) => [a.tipo, a.gravidade, a.texto]), [['HORA_A_MENOS', 'AVISO', 'Faltaram 1h 20min']]);
    assert.match(alertas[0].descricao, /6h 40min trabalhadas, meta de 8h 0min e sem justificativa/);
  });

  it('alertas: tolerância de 10 min, justificativa, dia não útil e o próprio dia de hoje não geram "Faltaram"', () => {
    const faltando = { totalMinutosTrabalhados: 400, saldoMinutos: -80 };
    assert.equal(alertasDoDia(dia({ ...faltando, saldoMinutos: -10 }), '2026-03-03').length, 0);
    assert.equal(alertasDoDia(dia({ ...faltando, saldoMinutos: -11 }), '2026-03-03').length, 1);
    assert.equal(alertasDoDia(dia({ ...faltando, justificativaNome: 'Atestado' }), '2026-03-03').length, 0);
    assert.equal(alertasDoDia(dia({ ...faltando, ehDiaUtil: false }), '2026-03-03').length, 0);
    assert.equal(alertasDoDia(dia(faltando), '2026-03-02').length, 0);
    assert.equal(alertasDoDia(dia(faltando), '2026-03-01').length, 0);
  });

  it('alertas: dia útil encerrado sem nenhum registro também avisa a meta inteira', () => {
    const alertas = alertasDoDia(dia({ totalMinutosTrabalhados: 0, saldoMinutos: -480 }), '2026-03-03');
    assert.equal(alertas[0].texto, 'Faltaram 8h 0min');
  });

  it('alertas: mais de 10h trabalhadas é erro, em qualquer dia, inclusive hoje e dia não útil; 10h exatas não alerta', () => {
    const excesso = alertasDoDia(dia({ totalMinutosTrabalhados: 670, saldoMinutos: 190 }), '2026-03-02');
    assert.deepEqual(excesso.map((a) => [a.tipo, a.gravidade, a.texto]), [['LIMITE_DIARIO', 'ERRO', 'Acima de 10h (+1h 10min)']]);
    assert.equal(alertasDoDia(dia({ totalMinutosTrabalhados: 600, saldoMinutos: 120 }), '2026-03-03').length, 0);
    assert.equal(alertasDoDia(dia({ totalMinutosTrabalhados: 700, ehDiaUtil: false }), '2026-03-03').length, 1);
  });
});
