import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { TipoUsuarioEnum } from '@project20/shared';
import { ActiveUser } from './active-user.decorator';
import { Public } from './public.decorator';
import { GestorOnly } from './gestor-only.decorator';
import { AdministradorOnly } from './administrador-only.decorator';

class Exemplo {
  metodo(@ActiveUser() _usuario: unknown) { return _usuario; }
}

test('@ActiveUser entrega o usuário que o JwtAuthGuard pôs na requisição', () => {
  const argumentos = Reflect.getMetadata(ROUTE_ARGS_METADATA, Exemplo, 'metodo');
  const [{ factory }] = Object.values(argumentos) as Array<{ factory: (dados: unknown, contexto: ExecutionContext) => unknown }>;
  const usuario = { sub: 3, login: 'ana', tipo: TipoUsuarioEnum.GESTOR };
  const contexto = { switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }) } as unknown as ExecutionContext;
  assert.equal(factory(undefined, contexto), usuario);
});

test('cada decorator de permissão grava a sua marca de metadado', () => {
  class Rotas {
    @Public() aberta() {}
    @GestorOnly() gestor() {}
    @AdministradorOnly() administrador() {}
  }
  assert.equal(Reflect.getMetadata('isPublic', Rotas.prototype.aberta), true);
  assert.equal(Reflect.getMetadata('gestorOnly', Rotas.prototype.gestor), true);
  assert.equal(Reflect.getMetadata('administradorOnly', Rotas.prototype.administrador), true);
  assert.equal(Reflect.getMetadata('gestorOnly', Rotas.prototype.aberta), undefined);
});
