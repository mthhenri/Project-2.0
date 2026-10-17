import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ALVOS, planejarConversoes } from './converter-descricoes';

test('converte só o que parece HTML do Quill e ignora vazio, nulo e Markdown', () => {
  const planejadas = planejarConversoes([
    { id: 1, valor: '<p>um</p><p>dois</p>' },
    { id: 2, valor: '# já é Markdown' },
    { id: 3, valor: null },
    { id: 4, valor: '' },
    { id: 5, valor: '<p>com <u>sublinhado</u></p>' },
  ]);
  assert.deepEqual(planejadas.map((p) => p.id), [1, 5]);
  assert.equal(planejadas[0].novo, 'um\ndois');
  assert.equal(planejadas[1].perdas.sublinhado, 1);
});

test('rodar de novo sobre o resultado não converte nada (idempotência)', () => {
  const primeira = planejarConversoes([{ id: 1, valor: '<h1>t</h1><p>x &lt;p&gt;y&lt;/p&gt;</p><ol><li data-list="bullet">a</li></ol>' }]);
  assert.equal(primeira.length, 1);
  const segunda = planejarConversoes([{ id: 1, valor: primeira[0].novo }]);
  assert.deepEqual(segunda, []);
});

test('os alvos são os campos de texto rico e nenhum campo de texto puro', () => {
  assert.deepEqual(
    ALVOS.map((alvo) => `${alvo.tabela}.${alvo.coluna}`),
    ['demanda.descricao_cliente', 'demanda.descricao_tecnica', 'demanda.documentacao', 'anotacao.texto'],
  );
});
