import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { compararTagsPorNome, estiloPillTag, nomeDeTagContem, nomeDeTagIgual } from './tag.util';

test('compararTagsPorNome ordena em pt-BR, sem separar acentuadas', () => {
  const nomes = ['Zeta', 'Ágil', 'api', 'Backend'];
  const ordenados = nomes.map((nome) => ({ nome })).sort(compararTagsPorNome).map((tag) => tag.nome);
  assert.deepEqual(ordenados, ['Ágil', 'api', 'Backend', 'Zeta']);
});

test('nomeDeTagIgual ignora caixa, acento e espaços nas pontas', () => {
  assert.equal(nomeDeTagIgual('Acentuação', '  acentuacao '), true);
  assert.equal(nomeDeTagIgual('Backend', 'BACKEND'), true);
  assert.equal(nomeDeTagIgual('Backend', 'Back end'), false);
});

test('nomeDeTagContem busca o termo em qualquer posição, sem caixa nem acento', () => {
  assert.equal(nomeDeTagContem('Integração contínua', 'INTEGRACAO'), true);
  assert.equal(nomeDeTagContem('Integração contínua', 'continua'), true);
  assert.equal(nomeDeTagContem('Integração contínua', 'deploy'), false);
  assert.equal(nomeDeTagContem('Backend', ''), true);
});

test('estiloPillTag deriva fundo, texto e borda da cor da tag', () => {
  assert.deepEqual(estiloPillTag('#112233'), {
    'background-color': '#11223322',
    color: '#112233',
    'border-color': '#11223355',
  });
});
