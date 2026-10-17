import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  anexarAoFeitoDoDia,
  anexarAoFim,
  contarOcorrencias,
  mesmaVersao,
  removerTrechoUnico,
  substituirTrechoUnico,
} from './anotacao-texto';

test('contarOcorrencias conta sem sobreposição e ignora trecho vazio', () => {
  assert.equal(contarOcorrencias('abcabc', 'abc'), 2);
  assert.equal(contarOcorrencias('aaaa', 'aa'), 2);
  assert.equal(contarOcorrencias('abc', 'x'), 0);
  assert.equal(contarOcorrencias('abc', ''), 0);
});

test('substituirTrechoUnico troca só quando o trecho aparece uma vez', () => {
  assert.deepEqual(substituirTrechoUnico('- a\n- b\n- c', '- b', '- B'), { ok: true, texto: '- a\n- B\n- c' });
  assert.deepEqual(substituirTrechoUnico('a b a', 'a', 'x'), { ok: false, motivo: 'AMBIGUO' });
  assert.deepEqual(substituirTrechoUnico('abc', 'z', 'x'), { ok: false, motivo: 'AUSENTE' });
});

test('substituirTrechoUnico aceita trocar por vazio e trecho com $ e regex', () => {
  assert.deepEqual(substituirTrechoUnico('custo $1.50 (x)', '$1.50 (x)', ''), { ok: true, texto: 'custo ' });
});

test('removerTrechoUnico leva junto a quebra de linha quando o trecho ocupa linhas inteiras', () => {
  assert.deepEqual(removerTrechoUnico('a\nb\nc', 'b'), { ok: true, texto: 'a\nc' });
  assert.deepEqual(removerTrechoUnico('a\nb', 'b'), { ok: true, texto: 'a' });
  assert.deepEqual(removerTrechoUnico('b\nc', 'b'), { ok: true, texto: 'c' });
  assert.deepEqual(removerTrechoUnico('só', 'só'), { ok: true, texto: '' });
});

test('removerTrechoUnico no meio de uma linha só tira o trecho', () => {
  assert.deepEqual(removerTrechoUnico('uma frase longa', ' longa'), { ok: true, texto: 'uma frase' });
});

test('removerTrechoUnico recusa ausente e ambíguo', () => {
  assert.deepEqual(removerTrechoUnico('x x', 'x'), { ok: false, motivo: 'AMBIGUO' });
  assert.deepEqual(removerTrechoUnico('abc', 'z'), { ok: false, motivo: 'AUSENTE' });
});

test('anexarAoFim: seção vazia recebe o texto; com conteúdo, uma linha em branco antes', () => {
  assert.equal(anexarAoFim('', 'novo'), 'novo');
  assert.equal(anexarAoFim('  \n', 'novo'), 'novo');
  assert.equal(anexarAoFim('antigo', 'novo'), 'antigo\n\nnovo');
  assert.equal(anexarAoFim('antigo\n\n\n', 'novo'), 'antigo\n\nnovo');
  assert.equal(anexarAoFim('antigo', '\n\nnovo\n'), 'antigo\n\nnovo');
  assert.equal(anexarAoFim('antigo', '   '), 'antigo');
});

test('anexarAoFeitoDoDia cria o título do dia quando falta', () => {
  assert.equal(anexarAoFeitoDoDia('', '17/10', 'fiz X'), '## 17/10\nfiz X');
  assert.equal(anexarAoFeitoDoDia('## 16/10\nontem', '17/10', 'fiz X'), '## 16/10\nontem\n\n## 17/10\nfiz X');
});

test('anexarAoFeitoDoDia reaproveita o título do dia e escreve debaixo dele', () => {
  assert.equal(anexarAoFeitoDoDia('## 17/10\nfiz X', '17/10', 'fiz Y'), '## 17/10\nfiz X\nfiz Y');
  assert.equal(anexarAoFeitoDoDia('## 17/10\nfiz X\n\n', '17/10', 'fiz Y'), '## 17/10\nfiz X\nfiz Y');
});

test('anexarAoFeitoDoDia escreve no bloco do dia mesmo quando há dia depois', () => {
  const texto = '## 16/10\nontem\n\n## 17/10\nhoje\n\n## 18/10\namanhã';
  assert.equal(
    anexarAoFeitoDoDia(texto, '17/10', 'mais uma'),
    '## 16/10\nontem\n\n## 17/10\nhoje\nmais uma\n\n## 18/10\namanhã',
  );
});

test('anexarAoFeitoDoDia duas vezes mantém um título só', () => {
  const uma = anexarAoFeitoDoDia('', '17/10', 'a');
  const duas = anexarAoFeitoDoDia(uma, '17/10', 'b');
  assert.equal(duas, '## 17/10\na\nb');
  assert.equal(contarOcorrencias(duas, '## 17/10'), 1);
});

test('mesmaVersao compara as datas pelo instante', () => {
  assert.equal(mesmaVersao(new Date('2026-10-17T10:00:00.123Z'), new Date('2026-10-17T10:00:00.123Z')), true);
  assert.equal(mesmaVersao(new Date('2026-10-17T10:00:00.123Z'), new Date('2026-10-17T10:00:00.124Z')), false);
  assert.equal(mesmaVersao(new Date('2026-10-17T10:00:00.123Z'), '2026-10-17T10:00:00.123Z' as unknown as Date), true);
});
