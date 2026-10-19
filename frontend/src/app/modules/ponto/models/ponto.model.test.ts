import { describe, it } from 'vitest';
import * as assert from 'node:assert/strict';
import { abreviacaoDiaSemana, formatarSaldoMinutos, numeroDoDia } from './ponto.model';

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
