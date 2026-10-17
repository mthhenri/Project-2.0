import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { temPermissaoDeAdministrador, temPermissaoDeGestor } from './permissao-usuario';

test('gestor tem permissão de gestor', () => {
  assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.GESTOR), true);
});

test('administrador tem permissão de gestor', () => {
  assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.ADMINISTRADOR), true);
});

test('desenvolvedor não tem permissão de gestor', () => {
  assert.equal(temPermissaoDeGestor(TipoUsuarioEnum.DESENVOLVEDOR), false);
});

test('só o administrador tem permissão de administrador', () => {
  assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.ADMINISTRADOR), true);
  assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.GESTOR), false);
  assert.equal(temPermissaoDeAdministrador(TipoUsuarioEnum.DESENVOLVEDOR), false);
});
