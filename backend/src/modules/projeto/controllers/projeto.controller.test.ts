import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { ProjetoController } from './projeto.controller';

// SYSTEM.SPEC.md §14: "Criar projeto" é do gestor (e do administrador). A service não recebe o usuário em criar/alterar/excluir:
// quem barra o desenvolvedor é o `@GestorOnly` — por isso o teste de permissão mora aqui.

test('criar, alterar, excluir, restaurar e o volume do mês do projeto são @GestorOnly', () => {
  const rotas = rotasPorNome(ProjetoController);
  for (const nome of ['criar', 'alterar', 'excluir', 'restaurar', 'listarVolume', 'listarVolumeAnual', 'listarVigencias', 'criarVigencia', 'excluirVigencia']) {
    assert.equal(rotas[nome].gestorOnly, true, `${nome} deveria ser @GestorOnly`);
  }
});

test('listar e recuperar ficam abertos a qualquer usuário autenticado (a service filtra por acesso)', () => {
  const rotas = rotasPorNome(ProjetoController);
  for (const nome of ['listar', 'recuperar']) {
    assert.equal(rotas[nome].gestorOnly, false, nome);
    assert.equal(rotas[nome].publica, false, nome);
  }
});

test('nenhuma rota de projeto é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotasPorNome(ProjetoController))) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos das rotas', () => {
  assert.deepEqual(
    Object.values(rotasPorNome(ProjetoController)).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['DELETE :id', 'GET /', 'GET :id', 'GET volume', 'GET volume/anual', 'PATCH :id/restaurar', 'POST /', 'PUT :id', 'GET :id/volume-vigencia', 'POST :id/volume-vigencia', 'DELETE :id/volume-vigencia/:vigenciaId'].sort(),
  );
});
