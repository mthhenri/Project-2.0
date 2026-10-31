import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { nomeDoArquivoDoRelatorio } from './nome-do-arquivo-do-relatorio';

test('código em minúsculas, "relatorio" e o ano-mês do período', () => {
  assert.equal(nomeDoArquivoDoRelatorio('DEV-AGENDA', '2026-10-01', '2026-10-31'), 'dev-agenda-relatorio-2026-10.csv');
});

test('período que atravessa meses mostra o mês do início e o do fim', () => {
  assert.equal(nomeDoArquivoDoRelatorio('DEV-AGENDA', '2026-09-15', '2026-10-14'), 'dev-agenda-relatorio-2026-09-a-2026-10.csv');
});

test('o código vira um nome de arquivo seguro: sem acento, espaço nem símbolo', () => {
  assert.equal(nomeDoArquivoDoRelatorio('Portal  Cliente/Ação', '2026-01-01', '2026-01-31'), 'portal-cliente-acao-relatorio-2026-01.csv');
});

test('código vazio ou só símbolos cai em "projeto"', () => {
  assert.equal(nomeDoArquivoDoRelatorio('###', '2026-01-01', '2026-01-31'), 'projeto-relatorio-2026-01.csv');
});
