import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { interpretarRedacaoDaDemanda, montarInstrucoesDeRedacaoDaDemanda } from './redacao-da-demanda';

const BASE = { demanda: 'Novo cadastro', projeto: 'GR', querCliente: true, querTecnica: true, descricaoClienteAtual: null, descricaoTecnicaAtual: null };

test('as instruções pedem Markdown, proíbem invenção e nomeiam os campos pedidos', () => {
  const texto = montarInstrucoesDeRedacaoDaDemanda(BASE);
  assert.match(texto, /Markdown/);
  assert.match(texto, /Nunca invente/);
  assert.match(texto, /"descricaoCliente" e "descricaoTecnica"/);
});

test('só pede o campo que tem relato e leva a descrição atual para não perdê-la', () => {
  const texto = montarInstrucoesDeRedacaoDaDemanda({ ...BASE, querTecnica: false, descricaoClienteAtual: 'Cadastro simples' });
  assert.match(texto, /com "descricaoCliente",/);
  assert.doesNotMatch(texto, /"descricaoTecnica"/);
  assert.match(texto, /incorporar sem perder nada: Cadastro simples/);
});

test('lê o objeto JSON, com ou sem cercas, e só devolve o que foi pedido', () => {
  const objeto = JSON.stringify({ descricaoCliente: '  Pedido do cliente  ', descricaoTecnica: '- Criar tela' });
  assert.deepEqual(interpretarRedacaoDaDemanda(objeto, { cliente: true, tecnica: true }), { descricaoCliente: 'Pedido do cliente', descricaoTecnica: '- Criar tela' });
  assert.deepEqual(interpretarRedacaoDaDemanda('```json\n' + objeto + '\n```', { cliente: true, tecnica: false }), { descricaoCliente: 'Pedido do cliente' });
});

test('resposta que não é objeto, sem os campos pedidos ou vazia não serve', () => {
  assert.equal(interpretarRedacaoDaDemanda('não sei', { cliente: true, tecnica: true }), null);
  assert.equal(interpretarRedacaoDaDemanda('{"descricaoTecnica": "x"}', { cliente: true, tecnica: false }), null);
  assert.equal(interpretarRedacaoDaDemanda('{"descricaoCliente": "  "}', { cliente: true, tecnica: false }), null);
  assert.equal(interpretarRedacaoDaDemanda('{quebrado', { cliente: true, tecnica: true }), null);
});
