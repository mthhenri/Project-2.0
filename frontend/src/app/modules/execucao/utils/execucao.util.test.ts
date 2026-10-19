import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { dataParaIso, isoParaData, mesmoDia, rotuloDoDia, horasCompactas, resumoDoDia } from './execucao.util';

const hoje = new Date(2026, 6, 10);

test('dataParaIso preenche mês e dia com zero à esquerda', () => {
  assert.equal(dataParaIso(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dataParaIso(new Date(2026, 11, 31)), '2026-12-31');
});

test('isoParaData devolve a data local à meia-noite e é o inverso de dataParaIso', () => {
  const data = isoParaData('2026-07-10');
  assert.ok(data);
  assert.equal(data.getHours(), 0);
  assert.equal(dataParaIso(data), '2026-07-10');
});

test('isoParaData recusa dia que não existe no calendário', () => {
  assert.equal(isoParaData('2026-02-30'), null);
  assert.equal(isoParaData('2026-13-01'), null);
});

test('isoParaData aceita 29 de fevereiro só em ano bissexto', () => {
  assert.ok(isoParaData('2028-02-29'));
  assert.equal(isoParaData('2026-02-29'), null);
});

test('isoParaData recusa formato errado, vazio, nulo e indefinido', () => {
  for (const entrada of ['10/07/2026', '2026-7-1', '2026-07-10T00:00', ' 2026-07-10', '', null, undefined]) {
    assert.equal(isoParaData(entrada), null, String(entrada));
  }
});

test('mesmoDia ignora a hora e distingue dias vizinhos', () => {
  assert.equal(mesmoDia(new Date(2026, 6, 10, 0, 0, 1), new Date(2026, 6, 10, 23, 59, 59)), true);
  assert.equal(mesmoDia(new Date(2026, 6, 10, 23, 59, 59), new Date(2026, 6, 11, 0, 0, 0)), false);
});

test('rotuloDoDia começa em maiúscula e omite o ano quando é o ano corrente', () => {
  assert.equal(rotuloDoDia(new Date(2026, 6, 9), hoje), 'Quinta-feira, 9 de julho');
});

test('rotuloDoDia inclui o ano quando o dia é de outro ano', () => {
  assert.equal(rotuloDoDia(new Date(2025, 6, 9), hoje), 'Quarta-feira, 9 de julho de 2025');
});

test('horasCompactas: 0, minutos soltos, hora cheia e horas com minutos', () => {
  assert.equal(horasCompactas(0), '0min');
  assert.equal(horasCompactas(45), '45min');
  assert.equal(horasCompactas(60), '1h00');
  assert.equal(horasCompactas(65), '1h05');
  assert.equal(horasCompactas(744), '12h24');
});

test('resumoDoDia sem execuções não mostra duração', () => {
  assert.equal(resumoDoDia(new Date(2026, 6, 9), 0, 0, hoje), 'Quinta-feira, 9 de julho · Nenhuma execução');
});

test('resumoDoDia usa o singular para uma execução', () => {
  assert.equal(resumoDoDia(new Date(2026, 6, 9), 1, 45, hoje), 'Quinta-feira, 9 de julho · 1 execução · 45min');
});

test('resumoDoDia usa o plural e o total compacto para várias execuções', () => {
  assert.equal(resumoDoDia(new Date(2026, 6, 9), 5, 744, hoje), 'Quinta-feira, 9 de julho · 5 execuções · 12h24');
});
