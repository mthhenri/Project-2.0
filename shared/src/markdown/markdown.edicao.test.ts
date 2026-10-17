import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  ajustarRecuoDeItens,
  alternarEnvolvimento,
  alternarPrefixo,
  continuarLista,
  inserirLink,
} from './markdown.edicao';

// --- Envolvimento (negrito, itálico, tachado, código) ---------------------------------------------

test('envolve a seleção com a marca e mantém o trecho selecionado', () => {
  assert.deepEqual(alternarEnvolvimento('uma palavra aqui', 4, 11, '**'), {
    texto: 'uma **palavra** aqui', inicio: 6, fim: 13,
  });
});

test('sem seleção insere o par de marcas e deixa o cursor entre elas', () => {
  assert.deepEqual(alternarEnvolvimento('ab', 1, 1, '*'), { texto: 'a**b', inicio: 2, fim: 2 });
});

test('desfaz o envolvimento quando as marcas estão por fora da seleção', () => {
  assert.deepEqual(alternarEnvolvimento('uma **palavra** aqui', 6, 13, '**'), {
    texto: 'uma palavra aqui', inicio: 4, fim: 11,
  });
});

test('desfaz o envolvimento quando as marcas estão dentro da seleção', () => {
  assert.deepEqual(alternarEnvolvimento('uma **palavra** aqui', 4, 15, '**'), {
    texto: 'uma palavra aqui', inicio: 4, fim: 11,
  });
});

test('itálico dentro de um negrito não confunde ** com *', () => {
  const resultado = alternarEnvolvimento('**x**', 2, 3, '*');
  assert.equal(resultado.texto, '***x***');
});

test('liga e desliga duas vezes devolve o texto original', () => {
  const ligado = alternarEnvolvimento('a b c', 2, 3, '~~');
  const desligado = alternarEnvolvimento(ligado.texto, ligado.inicio, ligado.fim, '~~');
  assert.equal(desligado.texto, 'a b c');
});

// --- Prefixos de linha ------------------------------------------------------------------------

test('lista em várias linhas, ignorando as vazias, e desfaz ao repetir', () => {
  const texto = 'a\n\nb';
  const ligado = alternarPrefixo(texto, 0, texto.length, 'lista');
  assert.equal(ligado.texto, '- a\n\n- b');
  const desligado = alternarPrefixo(ligado.texto, ligado.inicio, ligado.fim, 'lista');
  assert.equal(desligado.texto, texto);
});

test('lista numerada numera as linhas não vazias', () => {
  const texto = 'a\nb\nc';
  assert.equal(alternarPrefixo(texto, 0, texto.length, 'numerada').texto, '1. a\n2. b\n3. c');
});

test('trocar o tipo troca o prefixo em vez de empilhar', () => {
  assert.equal(alternarPrefixo('- item', 0, 6, 'numerada').texto, '1. item');
  assert.equal(alternarPrefixo('## Título', 0, 9, 'lista').texto, '- Título');
  assert.equal(alternarPrefixo('- [ ] tarefa', 0, 12, 'lista').texto, '- tarefa');
});

test('título, citação e tarefa ligam e desligam', () => {
  assert.equal(alternarPrefixo('Feito', 0, 5, 'titulo').texto, '## Feito');
  assert.equal(alternarPrefixo('## Feito', 0, 8, 'titulo').texto, 'Feito');
  assert.equal(alternarPrefixo('texto', 0, 5, 'citacao').texto, '> texto');
  assert.equal(alternarPrefixo('fazer', 0, 5, 'tarefa').texto, '- [ ] fazer');
});

test('só as linhas tocadas pela seleção mudam', () => {
  const texto = 'um\ndois\ntrês';
  assert.equal(alternarPrefixo(texto, 3, 6, 'lista').texto, 'um\n- dois\ntrês');
});

test('seleção que termina no começo de uma linha não inclui essa linha', () => {
  const texto = 'um\ndois\ntrês';
  assert.equal(alternarPrefixo(texto, 0, 3, 'lista').texto, '- um\ndois\ntrês');
});

// --- Link -------------------------------------------------------------------------------------

test('link usa a seleção como texto e seleciona o endereço', () => {
  const resultado = inserirLink('veja o site', 7, 11);
  assert.equal(resultado.texto, 'veja o [site](https://)');
  assert.equal(resultado.texto.slice(resultado.inicio, resultado.fim), 'https://');
});

test('link sem seleção usa um texto padrão', () => {
  assert.equal(inserirLink('', 0, 0).texto, '[texto](https://)');
});

// --- Enter em lista ---------------------------------------------------------------------------

test('Enter no fim de um item continua a lista', () => {
  const texto = '- um';
  assert.deepEqual(continuarLista(texto, texto.length), { texto: '- um\n- ', inicio: 7, fim: 7 });
});

test('Enter em lista numerada incrementa o número', () => {
  assert.equal(continuarLista('1. um', 5)?.texto, '1. um\n2. ');
  assert.equal(continuarLista('9) nove', 7)?.texto, '9) nove\n10) ');
});

test('Enter em tarefa continua com tarefa desmarcada, mantendo o recuo', () => {
  assert.equal(continuarLista('  - [x] feita', 13)?.texto, '  - [x] feita\n  - [ ] ');
});

test('Enter em item vazio sai da lista', () => {
  assert.deepEqual(continuarLista('- um\n- ', 7), { texto: '- um\n', inicio: 5, fim: 5 });
  assert.equal(continuarLista('- [ ] ', 6)?.texto, '');
});

test('Enter fora de lista, ou no meio de um item, segue o comportamento nativo', () => {
  assert.equal(continuarLista('texto comum', 11), null);
  assert.equal(continuarLista('- um item', 4), null);
  assert.equal(continuarLista('', 0), null);
});

// --- Tab em lista -----------------------------------------------------------------------------

test('Tab aninha e Shift+Tab desaninha os itens selecionados', () => {
  const texto = '- a\n- b';
  const aninhado = ajustarRecuoDeItens(texto, 0, texto.length, false);
  assert.equal(aninhado?.texto, '  - a\n  - b');
  const desaninhado = ajustarRecuoDeItens(aninhado!.texto, aninhado!.inicio, aninhado!.fim, true);
  assert.equal(desaninhado?.texto, texto);
});

test('Tab só no item onde está o cursor', () => {
  assert.equal(ajustarRecuoDeItens('- a\n- b', 5, 5, false)?.texto, '- a\n  - b');
});

test('Tab fora de lista devolve null (o foco segue o caminho nativo)', () => {
  assert.equal(ajustarRecuoDeItens('texto', 0, 0, false), null);
});

test('Shift+Tab sem recuo não muda o texto nem lança', () => {
  assert.equal(ajustarRecuoDeItens('- a', 0, 3, true)?.texto, '- a');
});
