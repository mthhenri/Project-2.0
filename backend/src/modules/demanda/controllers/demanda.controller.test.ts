import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { DemandaController } from './demanda.controller';

// SYSTEM.SPEC.md §14: excluir, restaurar, planejamento e conexões (criar e excluir) são do gestor; as demais rotas são abertas a
// qualquer autenticado e a service decide pelo tipo e pela participação. A ordem das rotas importa: `atribuidas`, `executadas`, `grafo` e
// `planejamento` precisam vir antes de `:id`, senão o Nest as lê como um id.

const rotas = () => rotasPorNome(DemandaController);

test('rotas @GestorOnly: planejamento, excluir, restaurar, criar conexão e excluir conexão', () => {
  const somenteGestor = Object.values(rotas()).filter((rota) => rota.gestorOnly).map((rota) => rota.nome).sort();
  assert.deepEqual(somenteGestor, ['criarConexao', 'excluir', 'excluirConexao', 'listarPlanejamento', 'restaurar'].sort());
});

test('criar, alterar, tags e membros ficam abertos: a service decide por tipo e participação', () => {
  for (const nome of ['criar', 'alterar', 'alterarTagsDemanda', 'atribuirMembro', 'removerMembro', 'recuperar', 'listar', 'listarExecutadas', 'recuperarGrafo']) {
    assert.equal(rotas()[nome].gestorOnly, false, nome);
  }
});

test('nenhuma rota de demanda é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  const esperado = [
    'POST /', 'GET /', 'GET grafo', 'GET :id/arvore', 'GET :id/ancestral', 'GET atribuidas', 'GET executadas', 'GET planejamento', 'GET :id', 'PUT :id',
    'DELETE :id', 'PATCH :id/restaurar', 'POST :id/conexao', 'GET :id/conexao', 'DELETE :id/conexao/:conexaoId', 'PUT :id/tag', 'GET :id/tag',
    'GET :id/membro', 'POST :id/membro', 'DELETE :id/membro/:usuarioId',
  ];
  assert.deepEqual(Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), [...esperado].sort());
});

test('as rotas de caminho fixo vêm antes de GET :id (senão "grafo" viraria um id)', () => {
  const ordem = Object.values(rotas()).filter((rota) => rota.verbo === 'GET').map((rota) => rota.caminho);
  const posicaoDeId = ordem.indexOf(':id');
  for (const fixo of ['grafo', 'atribuidas', 'executadas', 'planejamento']) {
    assert.ok(ordem.indexOf(fixo) < posicaoDeId, `${fixo} deve vir antes de :id`);
  }
});
