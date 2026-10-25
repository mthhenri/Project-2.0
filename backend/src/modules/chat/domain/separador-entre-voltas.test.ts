import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { separadorEntreVoltas } from './separador-entre-voltas';

test('sem texto antes não há o que separar', () => {
  assert.equal(separadorEntreVoltas(''), '');
});

test('depois de um texto corrido vem um parágrafo em branco', () => {
  assert.equal(separadorEntreVoltas('Vou consultar.'), '\n\n');
});

test('o que já termina em quebra de linha só completa o parágrafo', () => {
  assert.equal(separadorEntreVoltas('Vou consultar.\n'), '\n');
  assert.equal(separadorEntreVoltas('Vou consultar.\n\n'), '');
});
