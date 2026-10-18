import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { extrairEventos, paresDosDados } from './chat.util';

test('lê vários eventos de uma vez', () => {
  const texto = 'data: {"tipo":"trecho","texto":"Bom "}\n\ndata: {"tipo":"trecho","texto":"dia"}\n\n';
  const { eventos, resto } = extrairEventos(texto);
  assert.deepEqual(eventos, [{ tipo: 'trecho', texto: 'Bom ' }, { tipo: 'trecho', texto: 'dia' }]);
  assert.equal(resto, '');
});

test('guarda o pedaço incompleto para a próxima leitura', () => {
  const primeira = extrairEventos('data: {"tipo":"trecho","texto":"a"}\n\ndata: {"tipo":"tre');
  assert.equal(primeira.eventos.length, 1);
  assert.equal(primeira.resto, 'data: {"tipo":"tre');
  const segunda = extrairEventos(primeira.resto + 'cho","texto":"b"}\n\n');
  assert.deepEqual(segunda.eventos, [{ tipo: 'trecho', texto: 'b' }]);
});

test('o corte pode cair no meio do separador', () => {
  const primeira = extrairEventos('data: {"tipo":"proposta","propostaId":3}\n');
  assert.equal(primeira.eventos.length, 0);
  const segunda = extrairEventos(primeira.resto + '\n');
  assert.deepEqual(segunda.eventos, [{ tipo: 'proposta', propostaId: 3 }]);
});

test('ignora evento malformado e linhas que não são dados (comentários do fluxo)', () => {
  const { eventos } = extrairEventos(': ping\n\ndata: {quebrado\n\ndata: {"tipo":"erro","mensagem":"x"}\n\n');
  assert.deepEqual(eventos, [{ tipo: 'erro', mensagem: 'x' }]);
});

test('texto com acento e quebra de linha dentro do JSON chega inteiro', () => {
  const evento = JSON.stringify({ tipo: 'trecho', texto: 'linha 1\nlinha 2 — ação' });
  const { eventos } = extrairEventos(`data: ${evento}\n\n`);
  assert.deepEqual(eventos, [{ tipo: 'trecho', texto: 'linha 1\nlinha 2 — ação' }]);
});

test('pares dos dados mostram texto puro e JSON para o resto', () => {
  assert.deepEqual(paresDosDados({ nome: 'Corrigir login', ids: [1, 2], obrigatorio: true }), [
    { chave: 'nome', valor: 'Corrigir login' },
    { chave: 'ids', valor: '[1,2]' },
    { chave: 'obrigatorio', valor: 'true' },
  ]);
});
