import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { dataDaConversa, extrairEventos, formatarDuracao, paresDosDados, rotuloDoDia, semMarcacaoMarkdown } from './chat.util';

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

test('o dia da conversa é o final do id', () => {
  assert.equal(dataDaConversa('7-2026-10-17'), '2026-10-17');
  assert.equal(dataDaConversa('123-2026-01-05'), '2026-01-05');
});

test('rotula hoje, ontem e os outros dias, inclusive na virada de mês', () => {
  assert.equal(rotuloDoDia('2026-10-17', '2026-10-17'), 'Hoje');
  assert.equal(rotuloDoDia('2026-10-16', '2026-10-17'), 'Ontem');
  assert.equal(rotuloDoDia('2026-09-30', '2026-10-01'), 'Ontem');
  assert.match(rotuloDoDia('2026-10-10', '2026-10-17'), /^sáb\.?, 10\/10\/2026$/);
});

test('tira a marcação do Markdown e junta tudo numa linha', () => {
  const comMarcacao = ['Boa noite! **Plano do dia**', '', '1. **AAAA**: Integrações', '- Item'].join(String.fromCharCode(10));
  assert.equal(semMarcacaoMarkdown(comMarcacao), 'Boa noite! Plano do dia AAAA: Integrações Item');
  assert.equal(semMarcacaoMarkdown('  `código` e > citação  '), 'código e citação');
});

test('formata a duração como o cartão a diz', () => {
  assert.equal(formatarDuracao(45), '45 min');
  assert.equal(formatarDuracao(90), '1h30');
  assert.equal(formatarDuracao(160), '2h40');
  assert.equal(formatarDuracao(125), '2h05');
});
