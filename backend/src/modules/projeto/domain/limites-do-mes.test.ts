import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { limitesDoMes } from './limites-do-mes';

test('limitesDoMes: mês de 31, de 30 e dezembro', () => {
  assert.deepEqual(limitesDoMes(2026, 10), { dataInicio: '2026-10-01', dataFim: '2026-10-31' });
  assert.deepEqual(limitesDoMes(2026, 4), { dataInicio: '2026-04-01', dataFim: '2026-04-30' });
  assert.deepEqual(limitesDoMes(2026, 12), { dataInicio: '2026-12-01', dataFim: '2026-12-31' });
});

test('limitesDoMes: fevereiro em ano comum, bissexto e de século', () => {
  assert.equal(limitesDoMes(2026, 2).dataFim, '2026-02-28');
  assert.equal(limitesDoMes(2028, 2).dataFim, '2028-02-29');
  assert.equal(limitesDoMes(2100, 2).dataFim, '2100-02-28');
});
