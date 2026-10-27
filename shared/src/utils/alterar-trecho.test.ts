import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferirEncaixeDoTrecho, semMarcacaoDeMarkdown } from './alterar-trecho';

test('semMarcacaoDeMarkdown: tira negrito, código, título, citação, marcadores e tarefas', () => {
  assert.equal(semMarcacaoDeMarkdown('um **parágrafo** `formatado`'), 'um parágrafo formatado');
  assert.equal(semMarcacaoDeMarkdown('## Título'), 'Título');
  assert.equal(semMarcacaoDeMarkdown('- [ ] item um\n- [x] item dois'), 'item um item dois');
  assert.equal(semMarcacaoDeMarkdown('> citado\n1. numerado'), 'citado numerado');
});

test('encaixe: a resposta que muda só a seleção encaixa, também dentro de negrito e de item de lista', () => {
  assert.deepEqual(conferirEncaixeDoTrecho('O sistema deve exportar o relatório em PDF.', 'exportar', 'O sistema deve gerar o relatório em PDF.'), { encaixa: true });
  assert.deepEqual(conferirEncaixeDoTrecho('O sistema deve **exportar o relatório** em PDF.', 'exportar', 'O sistema deve **gerar o relatório** em PDF.'), { encaixa: true });
  assert.deepEqual(conferirEncaixeDoTrecho('- segundo item da lista', 'segundo', '- terceiro item da lista'), { encaixa: true });
  assert.deepEqual(conferirEncaixeDoTrecho('Uma frase simples.', 'frase', 'Uma frase muito simples.'), { encaixa: true });
});

test('encaixe: resposta igual ao bloco não muda nada', () => {
  assert.deepEqual(conferirEncaixeDoTrecho('Texto igual.', 'igual', 'Texto igual.'), { encaixa: false, motivo: 'IGUAL' });
});

test('encaixe: resposta que muda fora da seleção não encaixa', () => {
  const resposta = conferirEncaixeDoTrecho('O sistema deve exportar o relatório em PDF.', 'exportar', 'O sistema precisa gerar o relatório em PDF.');
  assert.deepEqual(resposta, { encaixa: false, motivo: 'FORA_DA_SELECAO' });
  assert.deepEqual(conferirEncaixeDoTrecho('Primeira frase. Segunda frase.', 'Segunda', 'Texto totalmente diferente.'), { encaixa: false, motivo: 'FORA_DA_SELECAO' });
});

test('encaixe: seleção que não está no bloco (ou vazia) não é alvo válido', () => {
  assert.deepEqual(conferirEncaixeDoTrecho('Texto do bloco.', 'outra coisa', 'Texto do novo bloco.'), { encaixa: false, motivo: 'SELECAO_AUSENTE' });
  assert.deepEqual(conferirEncaixeDoTrecho('Texto do bloco.', '   ', 'Texto do novo bloco.'), { encaixa: false, motivo: 'SELECAO_AUSENTE' });
});
