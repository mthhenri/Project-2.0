import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TipoUsuarioEnum } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AdministradorGuard } from './administrador.guard';

function contexto(usuario: unknown): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
  } as unknown as ExecutionContext;
}

function guardComMarcacao(marcado: boolean): AdministradorGuard {
  const reflector = { getAllAndOverride: () => marcado } as unknown as Reflector;
  return new AdministradorGuard(reflector);
}

test('rota sem a marcação passa para qualquer usuário', () => {
  assert.equal(guardComMarcacao(false).canActivate(contexto({ tipo: TipoUsuarioEnum.DESENVOLVEDOR })), true);
});

test('rota exclusiva de administrador: administrador passa, gestor e desenvolvedor levam 403', () => {
  const guard = guardComMarcacao(true);
  assert.equal(guard.canActivate(contexto({ tipo: TipoUsuarioEnum.ADMINISTRADOR })), true);
  assert.throws(() => guard.canActivate(contexto({ tipo: TipoUsuarioEnum.GESTOR })), UnauthorizedAccessException);
  assert.throws(() => guard.canActivate(contexto({ tipo: TipoUsuarioEnum.DESENVOLVEDOR })), UnauthorizedAccessException);
  assert.throws(() => guard.canActivate(contexto(undefined)), UnauthorizedAccessException);
});
