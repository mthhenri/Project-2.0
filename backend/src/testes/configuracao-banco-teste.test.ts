import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { resolverNomeBancoTeste } from './configuracao-banco-teste';

test('nome padrão do banco de teste termina em _teste', () => {
  assert.equal(resolverNomeBancoTeste('project20'), 'project20_teste');
});

test('DB_NOME_TESTE configurado é aceito', () => {
  assert.equal(resolverNomeBancoTeste('project20', 'banco_isolado'), 'banco_isolado');
});

test('recusa usar o banco de desenvolvimento como banco de teste', () => {
  assert.throws(() => resolverNomeBancoTeste('project20', 'project20'), /Recusado/);
  assert.throws(() => resolverNomeBancoTeste('banco_teste', 'banco_teste'), /Recusado/);
});
