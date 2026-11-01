import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TipoUsuarioEnum, podeGerenciarTag } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PermissaoGuard } from './permissao.guard';

function contexto(usuario: unknown): ExecutionContext {
    return {
        getHandler: () => () => undefined,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
    } as unknown as ExecutionContext;
}

const guardComPermissao = (permissao?: (tipo: TipoUsuarioEnum) => boolean) =>
    new PermissaoGuard({ getAllAndOverride: () => permissao } as unknown as Reflector);

test('rota sem @ExigePermissao passa para qualquer usuário', () => {
    assert.equal(guardComPermissao().canActivate(contexto({ tipo: TipoUsuarioEnum.DESENVOLVEDOR })), true);
});

test('rota com a permissão: auxiliar, gestor e administrador passam; desenvolvedor e anônimo levam 403', () => {
    const guard = guardComPermissao(podeGerenciarTag);
    assert.equal(guard.canActivate(contexto({ tipo: TipoUsuarioEnum.AUXILIAR })), true);
    assert.equal(guard.canActivate(contexto({ tipo: TipoUsuarioEnum.GESTOR })), true);
    assert.equal(guard.canActivate(contexto({ tipo: TipoUsuarioEnum.ADMINISTRADOR })), true);
    assert.throws(() => guard.canActivate(contexto({ tipo: TipoUsuarioEnum.DESENVOLVEDOR })), UnauthorizedAccessException);
    assert.throws(() => guard.canActivate(contexto(undefined)), UnauthorizedAccessException);
});

test('o guard consulta a marcação no método e na classe', () => {
    let alvos: unknown[] = [];
    const reflector = { getAllAndOverride: (_chave: string, lista: unknown[]) => { alvos = lista; return undefined; } };
    new PermissaoGuard(reflector as unknown as Reflector).canActivate(contexto({ tipo: TipoUsuarioEnum.GESTOR }));
    assert.equal(alvos.length, 2);
});
