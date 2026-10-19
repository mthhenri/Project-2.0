import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { UsuarioController } from './usuario.controller';
import { AutenticacaoController } from '../../autenticacao/controllers/autenticacao.controller';

// SYSTEM.SPEC.md §12 (`usuario`) e §14: gerenciar usuários é de gestor/administrador. As regras finas (administrador mexe em
// administrador, permanência do último) ficam na service; aqui só o que o decorator declara.

test('autenticação: só o login é público', () => {
  const rotas = rotasPorNome(AutenticacaoController);
  assert.deepEqual(Object.keys(rotas), ['login']);
  assert.equal(rotas['login'].publica, true);
  assert.equal(rotas['login'].verbo, 'POST');
  assert.equal(rotas['login'].caminho, 'login');
});

test('usuário: criar, listar, excluir, restaurar e trocar senha são @GestorOnly', () => {
  const rotas = rotasPorNome(UsuarioController);
  for (const nome of ['criar', 'listar', 'excluir', 'restaurar', 'alterarSenha']) {
    assert.equal(rotas[nome].gestorOnly, true, `${nome} deveria ser @GestorOnly`);
  }
});

test('usuário: nenhuma rota é pública nem exclusiva de administrador (a regra de administrador é da service)', () => {
  for (const rota of Object.values(rotasPorNome(UsuarioController))) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('usuário: recuperar e alterar não têm @GestorOnly — a service decide (desenvolvedor vê só o próprio perfil e não altera ninguém)', () => {
  const rotas = rotasPorNome(UsuarioController);
  assert.equal(rotas['recuperar'].gestorOnly, false);
  assert.equal(rotas['alterar'].gestorOnly, false);
});

test('usuário: verbos e caminhos das rotas', () => {
  const rotas = rotasPorNome(UsuarioController);
  assert.deepEqual(
    Object.values(rotas).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['DELETE :id', 'GET /', 'GET :id', 'PATCH :id/restaurar', 'PATCH :id/senha', 'POST /', 'PUT :id'].sort(),
  );
});
