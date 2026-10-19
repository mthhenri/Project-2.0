import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOME_DO_APP, URL_DO_PROJECT } from './config';

test('a URL do Project é http(s) válida e termina em barra', () => {
  const url = new URL(URL_DO_PROJECT);
  assert.ok(url.protocol === 'http:' || url.protocol === 'https:');
  assert.ok(URL_DO_PROJECT.endsWith('/'));
});

test('o nome do app não é vazio', () => {
  assert.ok(NOME_DO_APP.trim().length > 0);
});
