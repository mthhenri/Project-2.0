import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { corDoTextoSobre, ehCorAvatarValida, luminanciaDaCor, normalizarCorAvatar } from './cor-avatar';

test('ehCorAvatarValida: só #RRGGBB maiúsculo', () => {
    assert.equal(ehCorAvatarValida('#1A2B3C'), true);
    assert.equal(ehCorAvatarValida('#1a2b3c'), false);
    assert.equal(ehCorAvatarValida('#FFF'), false);
    assert.equal(ehCorAvatarValida('1A2B3C'), false);
    assert.equal(ehCorAvatarValida('#GGGGGG'), false);
    assert.equal(ehCorAvatarValida(null), false);
    assert.equal(ehCorAvatarValida(123456), false);
});

test('normalizarCorAvatar: tira espaços e põe em maiúsculas', () => {
    assert.equal(normalizarCorAvatar(' #1a2b3c '), '#1A2B3C');
});

test('luminanciaDaCor: preto 0 e branco 1', () => {
    assert.equal(luminanciaDaCor('#000000'), 0);
    assert.ok(Math.abs(luminanciaDaCor('#FFFFFF') - 1) < 1e-9);
});

test('corDoTextoSobre: claro sobre fundo escuro e escuro sobre fundo claro', () => {
    assert.equal(corDoTextoSobre('#000000'), '#FFFFFF');
    assert.equal(corDoTextoSobre('#1E3A8A'), '#FFFFFF');
    assert.equal(corDoTextoSobre('#FFFFFF'), '#111827');
    assert.equal(corDoTextoSobre('#FDE047'), '#111827');
});
