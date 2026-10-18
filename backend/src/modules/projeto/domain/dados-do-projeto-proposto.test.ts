import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CORES_DOS_PROJETOS, derivarCodigoDoProjeto, escolherCorDoProjeto } from './dados-do-projeto-proposto';

test('o código vem das iniciais das palavras com 3 letras ou mais, sem acento', () => {
  assert.equal(derivarCodigoDoProjeto('Sistema de Gestão'), 'SG');
  assert.equal(derivarCodigoDoProjeto('Gestão de Relacionamento com o Cliente'), 'GRCC');
});

test('nome de uma palavra só usa as 4 primeiras letras', () => {
  assert.equal(derivarCodigoDoProjeto('Loja'), 'LOJA');
  assert.equal(derivarCodigoDoProjeto('Financeiro'), 'FINA');
});

test('nome sem letras aproveitáveis ainda dá um código válido', () => {
  assert.ok(derivarCodigoDoProjeto('!!').length >= 2);
  assert.ok(derivarCodigoDoProjeto('A').length >= 2);
});

test('a cor é da paleta e é a mesma para o mesmo nome', () => {
  assert.ok(CORES_DOS_PROJETOS.includes(escolherCorDoProjeto('Loja')));
  assert.equal(escolherCorDoProjeto('Loja'), escolherCorDoProjeto('Loja'));
});
