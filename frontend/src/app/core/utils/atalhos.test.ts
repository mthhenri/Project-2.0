import { afterEach, test } from 'vitest';
import * as assert from 'node:assert/strict';
import { focoEmCampo, haSobreposicaoAberta } from './atalhos';

afterEach(() => {
  document.body.innerHTML = '';
});

test('foco em input, textarea e select conta como digitação', () => {
  for (const tag of ['input', 'textarea', 'select']) {
    const elemento = document.createElement(tag);
    assert.equal(focoEmCampo(elemento), true, tag);
  }
});

test('foco em botão ou div comum não conta como digitação', () => {
  assert.equal(focoEmCampo(document.createElement('button')), false);
  assert.equal(focoEmCampo(document.createElement('div')), false);
});

test('foco dentro de um contenteditable (editor de Markdown) conta como digitação', () => {
  const editor = document.createElement('div');
  editor.setAttribute('contenteditable', 'true');
  const filho = document.createElement('span');
  editor.appendChild(filho);
  document.body.appendChild(editor);
  assert.equal(focoEmCampo(filho), true);
});

test('sem alvo, não é campo', () => {
  assert.equal(focoEmCampo(null), false);
});

test('sem overlay no documento, não há sobreposição aberta', () => {
  assert.equal(haSobreposicaoAberta(), false);
});

test('dialog, popover, select, multiselect, datepicker, menu de contexto e confirmpopup abertos contam como sobreposição', () => {
  const classes = [
    'p-dialog-mask',
    'p-popover',
    'p-select-overlay',
    'p-multiselect-overlay',
    'p-datepicker-panel',
    'p-contextmenu',
    'p-confirmpopup',
  ];
  for (const classe of classes) {
    const overlay = document.createElement('div');
    overlay.className = classe;
    document.body.appendChild(overlay);
    assert.equal(haSobreposicaoAberta(), true, classe);
    overlay.remove();
  }
});

test('uma classe de overlay não relacionada não conta', () => {
  const div = document.createElement('div');
  div.className = 'p-card';
  document.body.appendChild(div);
  assert.equal(haSobreposicaoAberta(), false);
});
