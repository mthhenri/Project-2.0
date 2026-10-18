import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { MAXIMO_DE_CARACTERES_DA_SUGESTAO, MAXIMO_DE_SUGESTOES, interpretarSugestoes } from './sugestoes';

test('lê um array JSON, com ou sem cercas de código', () => {
  assert.deepEqual(interpretarSugestoes('["Começar pela primeira", "Criar uma atividade"]'), ['Começar pela primeira', 'Criar uma atividade']);
  assert.deepEqual(interpretarSugestoes('```json\n["Sim", "Não"]\n```'), ['Sim', 'Não']);
  assert.deepEqual(interpretarSugestoes('Claro: ["Anotar no pad"] espero que ajude'), ['Anotar no pad']);
});

test('descarta o que não é texto válido, repetido ou grande demais, e limita a quantidade', () => {
  const longa = 'x'.repeat(MAXIMO_DE_CARACTERES_DA_SUGESTAO + 1);
  assert.deepEqual(interpretarSugestoes(JSON.stringify(['Sim', 'Sim', 7, null, longa, 'a', 'Talvez.'])), ['Sim', 'Talvez']);
  assert.equal(interpretarSugestoes(JSON.stringify(['a1', 'b2', 'c3', 'd4', 'e5', 'f6'])).length, MAXIMO_DE_SUGESTOES);
});

test('tira aspas e quebras; resposta que não é array vira vazio', () => {
  assert.deepEqual(interpretarSugestoes('["Criar a demanda \\"estrutura\\"", "Ver  as\\natividades"]'), ['Criar a demanda estrutura', 'Ver as atividades']);
  assert.deepEqual(interpretarSugestoes('não sei'), []);
  assert.deepEqual(interpretarSugestoes('{"a": 1}'), []);
  assert.deepEqual(interpretarSugestoes('[1, 2'), []);
});
