import { describe, it } from 'vitest';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { podeAbrirAnotacoes } from './anotacoes-acesso.util';

const dev = (id: number) => ({ id, tipo: TipoUsuarioEnum.DESENVOLVEDOR });
const gestor = (id: number) => ({ id, tipo: TipoUsuarioEnum.GESTOR });
const admin = (id: number) => ({ id, tipo: TipoUsuarioEnum.ADMINISTRADOR });

describe('podeAbrirAnotacoes (task 195)', () => {
  it('cada um abre o próprio pad, seja qual for o tipo', () => {
    for (const usuario of [dev(1), gestor(2), admin(3)]) assert.equal(podeAbrirAnotacoes(usuario, usuario), true);
  });

  it('gestor e administrador abrem o pad de desenvolvedores', () => {
    assert.equal(podeAbrirAnotacoes(gestor(2), dev(1)), true);
    assert.equal(podeAbrirAnotacoes(admin(3), dev(1)), true);
  });

  it('gestor e administrador não abrem o pad de outro gestor ou administrador', () => {
    assert.equal(podeAbrirAnotacoes(gestor(2), gestor(4)), false);
    assert.equal(podeAbrirAnotacoes(gestor(2), admin(3)), false);
    assert.equal(podeAbrirAnotacoes(admin(3), gestor(2)), false);
    assert.equal(podeAbrirAnotacoes(admin(3), admin(5)), false);
  });

  it('o desenvolvedor só abre o próprio', () => {
    assert.equal(podeAbrirAnotacoes(dev(1), dev(6)), false);
    assert.equal(podeAbrirAnotacoes(dev(1), gestor(2)), false);
  });
});
