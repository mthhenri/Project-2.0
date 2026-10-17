import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { temPermissaoDeGestor } from './permissao-usuario';

test('gestor tem permissão de gestor', () => {
  assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.GESTOR), true);
});

test('desenvolvedor não tem permissão de gestor', () => {
  assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.DESENVOLVEDOR), false);
});
