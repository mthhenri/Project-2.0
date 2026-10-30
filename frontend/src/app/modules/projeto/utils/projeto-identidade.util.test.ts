import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { corTextoSobre, siglaDoProjeto } from './projeto-identidade.util';

test('sigla: iniciais das duas primeiras palavras, ignorando conectivos', () => {
  assert.equal(siglaDoProjeto('Portal do Cliente'), 'PC');
  assert.equal(siglaDoProjeto('Gestão de Projetos Internos'), 'GP');
  assert.equal(siglaDoProjeto('  api   pagamentos '), 'AP');
});

test('sigla: uma palavra só usa as duas primeiras letras; acento e minúscula são tratados', () => {
  assert.equal(siglaDoProjeto('Portal'), 'PO');
  assert.equal(siglaDoProjeto('érica'), 'ÉR');
  assert.equal(siglaDoProjeto('X'), 'X');
});

test('sigla: nome só de conectivos ou vazio não quebra', () => {
  assert.equal(siglaDoProjeto('de da'), 'DD');
  assert.equal(siglaDoProjeto('   '), '');
  assert.equal(siglaDoProjeto('— Portal'), 'PO');
});

test('texto sobre a cor: branco em fundo escuro, escuro em fundo claro, branco se a cor for inválida', () => {
  assert.equal(corTextoSobre('#336699'), '#ffffff');
  assert.equal(corTextoSobre('#1f2937'), '#ffffff');
  assert.equal(corTextoSobre('#f5c518'), '#1c2430');
  assert.equal(corTextoSobre('azul'), '#ffffff');
});
