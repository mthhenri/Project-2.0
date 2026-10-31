import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { DIVISAO, larguraDaPrimeiraPeloPonteiro, larguraMaximaDaPrimeira, limitarLarguraDaPrimeira } from './alca-divisao.util';

const limites = { minima: DIVISAO.minima, minimaDoOutro: DIVISAO.minimaDoOutro };

test('o máximo deixa o vão e a largura mínima da outra coluna, e nunca fica abaixo da mínima', () => {
  assert.equal(larguraMaximaDaPrimeira(1200, limites), 1200 - 16 - 384);
  assert.equal(larguraMaximaDaPrimeira(500, limites), DIVISAO.minima);
});

test('a largura é limitada entre o mínimo e o máximo e arredondada', () => {
  assert.equal(limitarLarguraDaPrimeira(100, 1200, limites), DIVISAO.minima);
  assert.equal(limitarLarguraDaPrimeira(5000, 1200, limites), 800);
  assert.equal(limitarLarguraDaPrimeira(500.6, 1200, limites), 501);
});

test('valor ilegível volta ao padrão, que também respeita o máximo', () => {
  assert.equal(limitarLarguraDaPrimeira(Number.NaN, 1200, limites), DIVISAO.padrao);
  assert.equal(limitarLarguraDaPrimeira(Number.NaN, 700, limites), 352);
});

test('o ponteiro no meio do vão: a primeira coluna termina meio vão antes dele', () => {
  assert.equal(larguraDaPrimeiraPeloPonteiro(100 + 508, 100, 1200, limites), 500);
  assert.equal(larguraDaPrimeiraPeloPonteiro(0, 100, 1200, limites), DIVISAO.minima);
  assert.equal(larguraDaPrimeiraPeloPonteiro(5000, 100, 1200, limites), 800);
});

test('área sem medida (largura 0): só o mínimo vale e o padrão passa', () => {
  assert.equal(limitarLarguraDaPrimeira(5000, 0, limites), 5000);
  assert.equal(limitarLarguraDaPrimeira(10, 0, limites), DIVISAO.minima);
  assert.equal(limitarLarguraDaPrimeira(Number.NaN, 0, limites), DIVISAO.padrao);
});
