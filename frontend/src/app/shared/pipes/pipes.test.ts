import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { DataBrasileiraPipe } from './data-brasileira.pipe';
import { MinutosParaHorasPipe } from './minutos-para-horas.pipe';
import { TempoExibicaoPipe } from './tempo-exibicao.pipe';

test('data: nulo, indefinido e vazio viram texto vazio', () => {
  const pipe = new DataBrasileiraPipe();
  assert.equal(pipe.transform(null), '');
  assert.equal(pipe.transform(undefined), '');
  assert.equal(pipe.transform(''), '');
});

test('data: string só com data (YYYY-MM-DD) não sofre deslocamento de fuso', () => {
  const pipe = new DataBrasileiraPipe();
  assert.equal(pipe.transform('2026-03-01'), '01/03/2026');
  assert.equal(pipe.transform('2026-12-31'), '31/12/2026');
});

test('data: objeto Date é formatado no padrão dd/mm/aaaa', () => {
  const pipe = new DataBrasileiraPipe();
  assert.equal(pipe.transform(new Date(2026, 6, 4, 10, 0)), '04/07/2026');
});

test('data: string com horário (ISO completo) é interpretada como instante', () => {
  const pipe = new DataBrasileiraPipe();
  const instante = '2026-05-10T15:30:00';
  assert.equal(pipe.transform(instante), new Date(instante).toLocaleDateString('pt-BR'));
  assert.equal(pipe.transform(instante), '10/05/2026');
});

test('minutos para horas: nulo e indefinido viram 0h 0min', () => {
  const pipe = new MinutosParaHorasPipe();
  assert.equal(pipe.transform(null), '0h 0min');
  assert.equal(pipe.transform(undefined), '0h 0min');
});

test('minutos para horas: separa horas inteiras e minutos restantes', () => {
  const pipe = new MinutosParaHorasPipe();
  assert.equal(pipe.transform(0), '0h 0min');
  assert.equal(pipe.transform(59), '0h 59min');
  assert.equal(pipe.transform(60), '1h 0min');
  assert.equal(pipe.transform(135), '2h 15min');
  assert.equal(pipe.transform(1500), '25h 0min');
});

test('tempo de exibição: modo horas com unidade horas mostra "{h}h"', () => {
  assert.equal(new TempoExibicaoPipe().transform(3, false, 'horas'), '3h');
});

test('tempo de exibição: modo horas com minutos mostra "{h}h {min}min"', () => {
  assert.equal(new TempoExibicaoPipe().transform(90, false, 'minutos'), '1h 30min');
  assert.equal(new TempoExibicaoPipe().transform(45, false, 'minutos'), '0h 45min');
});

test('tempo de exibição: modo dias usa 8h por dia, vírgula e singular só em "1 dia"', () => {
  const pipe = new TempoExibicaoPipe();
  assert.equal(pipe.transform(8, true, 'horas'), '1 dia');
  assert.equal(pipe.transform(16, true, 'horas'), '2 dias');
  assert.equal(pipe.transform(4, true, 'horas'), '0,5 dias');
  assert.equal(pipe.transform(480, true, 'minutos'), '1 dia');
  assert.equal(pipe.transform(100, true, 'minutos'), '0,21 dias');
  assert.equal(pipe.transform(0, true, 'horas'), '0 dias');
});
