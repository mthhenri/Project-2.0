import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TipoUsuarioEnum } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { GestorGuard } from './gestor.guard';

function contexto(usuario: unknown): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
  } as unknown as ExecutionContext;
}

const guardComMarcacao = (marcado: boolean) =>
  new GestorGuard({ getAllAndOverride: () => marcado } as unknown as Reflector);

test('rota sem @GestorOnly passa para qualquer usuário', () => {
  assert.equal(guardComMarcacao(false).canActivate(contexto({ tipo: TipoUsuarioEnum.DESENVOLVEDOR })), true);
});

test('rota @GestorOnly: gestor e administrador passam, desenvolvedor e anônimo levam 403', () => {
  const guard = guardComMarcacao(true);
  assert.equal(guard.canActivate(contexto({ tipo: TipoUsuarioEnum.GESTOR })), true);
  assert.equal(guard.canActivate(contexto({ tipo: TipoUsuarioEnum.ADMINISTRADOR })), true);
  assert.throws(() => guard.canActivate(contexto({ tipo: TipoUsuarioEnum.DESENVOLVEDOR })), UnauthorizedAccessException);
  assert.throws(() => guard.canActivate(contexto(undefined)), UnauthorizedAccessException);
});

test('o guard consulta a marcação no método e na classe (o método prevalece)', () => {
  let alvos: unknown[] = [];
  const reflector = { getAllAndOverride: (_chave: string, lista: unknown[]) => { alvos = lista; return false; } };
  new GestorGuard(reflector as unknown as Reflector).canActivate(contexto({ tipo: TipoUsuarioEnum.GESTOR }));
  assert.equal(alvos.length, 2);
});
