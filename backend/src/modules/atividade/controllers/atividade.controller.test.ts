import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { AtividadeController } from './atividade.controller';

// SYSTEM.SPEC.md §14: excluir e restaurar atividade são do gestor; criar, listar, recuperar, alterar e tags ficam abertos a qualquer
// autenticado e a service decide por tipo e vínculo. As ações em massa da listagem (task 102) não têm rota própria: a tela chama estas
// mesmas rotas uma vez por atividade, então valem as mesmas permissões.

const rotas = () => rotasPorNome(AtividadeController);

test('rotas @GestorOnly: só excluir e restaurar', () => {
  const somenteGestor = Object.values(rotas()).filter((rota) => rota.gestorOnly).map((rota) => rota.nome).sort();
  assert.deepEqual(somenteGestor, ['excluir', 'restaurar']);
});

test('criar, listar, recuperar, alterar e tags ficam abertos: a service decide por tipo e vínculo', () => {
  for (const nome of ['criar', 'listar', 'recuperar', 'alterar', 'alterarTags', 'listarTags']) {
    assert.equal(rotas()[nome].gestorOnly, false, nome);
  }
});

test('nenhuma rota de atividade é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  const esperado = ['POST /', 'GET /', 'GET :id', 'PUT :id', 'DELETE :id', 'PATCH :id/restaurar', 'PUT :id/tag', 'GET :id/tag'];
  assert.deepEqual(Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), [...esperado].sort());
});

test('o controller repassa o usuário do token à service nas rotas que decidem por tipo', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new AtividadeController({
    criar: registrar('criar'), alterar: registrar('alterar'), listar: registrar('listar'), recuperar: registrar('recuperar'),
    alterarTags: registrar('alterarTags'), listarTags: registrar('listarTags'),
  } as never);
  const usuario = { sub: 3 } as never;

  await controller.criar({ demandaId: 1 } as never, usuario);
  await controller.listar({} as never, usuario);
  await controller.recuperar(5, usuario);
  await controller.alterar(5, { nome: 'X' } as never, usuario);
  await controller.alterarTags(5, { tagIds: [1] } as never, usuario);
  await controller.listarTags(5, usuario);

  assert.ok(chamadas.every((chamada) => chamada[chamada.length - 1] === usuario), 'toda chamada leva o usuário do token');
  assert.deepEqual(chamadas.find((chamada) => chamada[0] === 'alterar')?.[1], { id: 5, nome: 'X' });
  assert.deepEqual(chamadas.find((chamada) => chamada[0] === 'alterarTags')?.[1], { id: 5, tagIds: [1] });
});
