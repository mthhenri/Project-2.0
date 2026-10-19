import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { calcularConjuntoDeTags, mesmoConjuntoDeTags } from './conjunto-de-tags';

test('calcularConjuntoDeTags: acrescenta, tira, não repete e ordena', () => {
  assert.deepEqual(calcularConjuntoDeTags([3, 1], [2, 3], [1]), [2, 3]);
  assert.deepEqual(calcularConjuntoDeTags([5, 1, 5]), [1, 5]);
});

test('calcularConjuntoDeTags: o que sai vence o que entra e tirar o que não está não muda nada', () => {
  assert.deepEqual(calcularConjuntoDeTags([1], [2], [2]), [1]);
  assert.deepEqual(calcularConjuntoDeTags([1, 2], [], [9]), [1, 2]);
  assert.deepEqual(calcularConjuntoDeTags([], [], []), []);
});

test('calcularConjuntoDeTags: não altera os vetores de entrada', () => {
  const atuais = [3, 1];
  calcularConjuntoDeTags(atuais, [2], [1]);
  assert.deepEqual(atuais, [3, 1]);
});

test('mesmoConjuntoDeTags: ignora ordem e repetição, mas não conteúdo', () => {
  assert.equal(mesmoConjuntoDeTags([1, 2], [2, 1]), true);
  assert.equal(mesmoConjuntoDeTags([1, 1, 2], [2, 1]), true);
  assert.equal(mesmoConjuntoDeTags([1, 2], [1, 3]), false);
  assert.equal(mesmoConjuntoDeTags([1], [1, 2]), false);
  assert.equal(mesmoConjuntoDeTags([], []), true);
});
