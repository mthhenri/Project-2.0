import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { decidirFechamento, destinoDaNavegacao, janelaForaDoLugar, resolverUrlDoProject, textoDoProximoCheckin } from './politica-da-janela';

test('fechar, Alt+F4 e afins só minimizam', () => {
  assert.equal(decidirFechamento({ saidaConfirmada: false, encerramentoDoSistema: false }), 'minimizar');
});

test('a saída confirmada na bandeja e o desligamento do sistema fecham de verdade', () => {
  assert.equal(decidirFechamento({ saidaConfirmada: true, encerramentoDoSistema: false }), 'fechar');
  assert.equal(decidirFechamento({ saidaConfirmada: false, encerramentoDoSistema: true }), 'fechar');
});

test('a janela precisa voltar quando deixa de estar maximizada ou muda de lugar ou tamanho', () => {
  const area = { x: 0, y: 0, width: 1920, height: 1040 };
  assert.equal(janelaForaDoLugar(area, area, true), false);
  assert.equal(janelaForaDoLugar(area, area, false), true);
  assert.equal(janelaForaDoLugar({ ...area, x: 40 }, area, true), true);
  assert.equal(janelaForaDoLugar({ ...area, height: 1000 }, area, true), true);
});

test('links do próprio Project ficam na janela e os demais vão para o navegador', () => {
  const base = 'http://localhost:4200/';
  assert.equal(destinoDaNavegacao('http://localhost:4200/atividade', base), 'dentro');
  assert.equal(destinoDaNavegacao('https://exemplo.com/doc', base), 'navegador');
  assert.equal(destinoDaNavegacao('http://localhost:3000/api', base), 'navegador');
  assert.equal(destinoDaNavegacao('nao-e-url', base), 'navegador');
});

test('a URL padrão vale, e o ambiente só a troca por um endereço válido', () => {
  const padrao = 'http://localhost:4200/';
  assert.equal(resolverUrlDoProject(padrao, {}), padrao);
  assert.equal(resolverUrlDoProject(padrao, { PROJECT_DESKTOP_URL: 'http://servidor:8080/' }), 'http://servidor:8080/');
  assert.equal(resolverUrlDoProject(padrao, { PROJECT_DESKTOP_URL: 'lixo' }), padrao);
  assert.equal(resolverUrlDoProject(padrao, { PROJECT_DESKTOP_URL: '  ' }), padrao);
});

test('o tempo até o check-in aparece em mm:ss, com horas quando passa de uma, ou indisponível', () => {
  assert.equal(textoDoProximoCheckin(null), 'Próximo check-in: indisponível');
  assert.equal(textoDoProximoCheckin(752), 'Próximo check-in em 12:32');
  assert.equal(textoDoProximoCheckin(3725), 'Próximo check-in em 1:02:05');
  assert.equal(textoDoProximoCheckin(-4), 'Próximo check-in em 00:00');
});
