import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { ModelagemController } from './modelagem.controller';

// A tela Modelagem é de todos: desenvolvedor, gestor e administrador.

test('o diagrama é aberto a qualquer usuário autenticado (nem público, nem de gestor, nem de administrador)', () => {
  const rotas = Object.values(rotasPorNome(ModelagemController));
  assert.equal(rotas.length, 1);
  assert.equal(`${rotas[0].verbo} ${rotas[0].caminho}`, 'GET /');
  assert.equal(rotas[0].publica, false);
  assert.equal(rotas[0].gestorOnly, false);
  assert.equal(rotas[0].administradorOnly, false);
});
