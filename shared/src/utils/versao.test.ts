import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { compararVersoes, lerVersao, versaoEhMaisNova } from './versao';

test('lerVersao aceita maior.menor.correcao e recusa o resto', () => {
  assert.deepEqual(lerVersao('1.2.3'), [1, 2, 3]);
  assert.deepEqual(lerVersao(' 10.0.1 '), [10, 0, 1]);
  for (const ruim of ['1.2', '1.2.3.4', 'v1.2.3', '1.2.x', '', 'abc']) assert.equal(lerVersao(ruim), null);
});

test('compararVersoes compara número a número, não texto (1.10.0 > 1.9.0)', () => {
  assert.ok(compararVersoes('1.10.0', '1.9.0') > 0);
  assert.ok(compararVersoes('1.0.0', '1.0.1') < 0);
  assert.ok(compararVersoes('2.0.0', '1.99.99') > 0);
  assert.equal(compararVersoes('1.2.3', '1.2.3'), 0);
  assert.ok(compararVersoes('1.0.0', 'lixo') > 0);
  assert.ok(compararVersoes('lixo', '1.0.0') < 0);
  assert.equal(compararVersoes('lixo', 'outro'), 0);
});

test('versaoEhMaisNova só avisa quando as duas são legíveis e a publicada é maior', () => {
  assert.equal(versaoEhMaisNova('1.2.0', '1.0.0'), true);
  assert.equal(versaoEhMaisNova('1.0.0', '1.0.0'), false);
  assert.equal(versaoEhMaisNova('1.0.0', '1.2.0'), false);
  assert.equal(versaoEhMaisNova('lixo', '1.0.0'), false);
  assert.equal(versaoEhMaisNova('1.2.0', 'lixo'), false);
});
