import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { usuarioPodeUsar } from './ferramenta-ia';

const tipos = Object.values(TipoUsuarioEnum);
const quemPode = (permissao: Parameters<typeof usuarioPodeUsar>[0]) => tipos.filter((tipo) => usuarioPodeUsar(permissao, tipo)).sort();

test('QUALQUER: todos os tipos', () => {
    assert.deepEqual(quemPode('QUALQUER'), [...tipos].sort());
});

test('AUXILIAR: auxiliar, gestor e administrador; o desenvolvedor não', () => {
    assert.deepEqual(quemPode('AUXILIAR'), [TipoUsuarioEnum.ADMINISTRADOR, TipoUsuarioEnum.AUXILIAR, TipoUsuarioEnum.GESTOR].sort());
});

test('GESTOR: gestor e administrador; o auxiliar não', () => {
    assert.deepEqual(quemPode('GESTOR'), [TipoUsuarioEnum.ADMINISTRADOR, TipoUsuarioEnum.GESTOR].sort());
});

test('ADMINISTRADOR: só o administrador', () => {
    assert.deepEqual(quemPode('ADMINISTRADOR'), [TipoUsuarioEnum.ADMINISTRADOR]);
});
