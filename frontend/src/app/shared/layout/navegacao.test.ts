import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { ITENS_NAVEGACAO } from './navegacao';

const porRota = (rota: string) => ITENS_NAVEGACAO.find((item) => item.rotaLink === rota);

test('as teclas de atalho (g + letra) são únicas e de uma letra', () => {
  const teclas = ITENS_NAVEGACAO.map((item) => item.tecla);
  assert.equal(new Set(teclas).size, teclas.length);
  for (const tecla of teclas) assert.match(tecla, /^[a-z]$/);
});

test('as rotas e os rótulos são únicos e as rotas começam com /', () => {
  const rotas = ITENS_NAVEGACAO.map((item) => item.rotaLink);
  assert.equal(new Set(rotas).size, rotas.length);
  assert.equal(new Set(ITENS_NAVEGACAO.map((item) => item.label)).size, rotas.length);
  for (const rota of rotas) assert.ok(rota.startsWith('/'), rota);
});

test('o desenvolvedor vê Ponto, Demandas, Chat, Atividades, Execuções e Modelagem', () => {
  const visiveis = ITENS_NAVEGACAO.filter((item) => !item.somenteGestor).map((item) => item.rotaLink);
  assert.deepEqual(visiveis, ['/ponto', '/demanda', '/chat', '/atividade', '/execucao', '/modelagem']);
});

test('o gestor vê tudo menos o que é só do administrador', () => {
  const visiveis = ITENS_NAVEGACAO.filter((item) => !item.somenteAdministrador).map((item) => item.rotaLink);
  assert.deepEqual(visiveis, [
    '/ponto', '/calendario', '/projeto', '/demanda', '/chat', '/atividade', '/execucao', '/tag', '/usuario', '/modelagem',
  ]);
});

test('o administrador vê todos os itens e só a IA é exclusiva dele', () => {
  const exclusivos = ITENS_NAVEGACAO.filter((item) => item.somenteAdministrador).map((item) => item.rotaLink);
  assert.deepEqual(exclusivos, ['/configuracao-ia']);
});

test('item exclusivo do administrador também é de gestor (nunca aparece para o desenvolvedor)', () => {
  for (const item of ITENS_NAVEGACAO.filter((candidato) => candidato.somenteAdministrador)) {
    assert.equal(item.somenteGestor, true, item.label);
  }
});

test('Atividades segue aberta com a IA no ar e o Chat exige a IA', () => {
  assert.equal(porRota('/atividade')?.substituidoPelaIa, undefined);
  assert.equal(porRota('/chat')?.exigeIa, true);
});

test('Modelagem fica logo abaixo de IA e qualquer usuário a vê', () => {
  const rotas = ITENS_NAVEGACAO.map((item) => item.rotaLink);
  assert.equal(rotas.indexOf('/modelagem'), rotas.indexOf('/configuracao-ia') + 1);
  const modelagem = porRota('/modelagem');
  assert.equal(modelagem?.somenteGestor, false);
  assert.equal(modelagem?.somenteAdministrador, undefined);
});
