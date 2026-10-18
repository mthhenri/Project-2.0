import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ENDERECO_DE_CONTINUAR, ENDERECO_DE_SAIR, montarPaginaDoDialogoDeSaida, respostaDaNavegacao } from './dialogo-de-saida';

test('cada botão do aviso vira uma resposta; outra navegação é ignorada', () => {
  assert.equal(respostaDaNavegacao(ENDERECO_DE_SAIR), 'sair');
  assert.equal(respostaDaNavegacao(ENDERECO_DE_CONTINUAR), 'continuar');
  assert.equal(respostaDaNavegacao('https://exemplo.com/'), null);
  assert.equal(respostaDaNavegacao('data:text/html,x'), null);
});

test('a página traz os dois botões e o texto de que o check-in é desativado', () => {
  const pagina = montarPaginaDoDialogoDeSaida('Project Desktop');
  assert.match(pagina, /Fechar completamente/);
  assert.match(pagina, /Continuar usando/);
  assert.match(pagina, /desativa o check-in/);
  assert.match(pagina, /prefers-color-scheme: dark/);
  assert.ok(pagina.includes(ENDERECO_DE_SAIR) && pagina.includes(ENDERECO_DE_CONTINUAR));
});
