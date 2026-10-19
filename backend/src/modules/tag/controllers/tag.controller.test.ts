import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { TagController } from './tag.controller';

// SYSTEM.SPEC.md §14 "Criar e atribuir tag": só o gestor cria, altera e exclui; ler as tags é de qualquer autenticado.

const rotas = () => rotasPorNome(TagController);

test('criar, alterar, excluir e restaurar são @GestorOnly', () => {
  for (const nome of ['criar', 'alterar', 'excluir', 'restaurar']) assert.equal(rotas()[nome].gestorOnly, true, nome);
});

test('listar e recuperar ficam abertos a qualquer autenticado', () => {
  for (const nome of ['listar', 'recuperar']) assert.equal(rotas()[nome].gestorOnly, false, nome);
});

test('nenhuma rota de tag é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  assert.deepEqual(
    Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['DELETE :id', 'GET :id', 'GET /', 'PATCH :id/restaurar', 'POST /', 'PUT :id'].sort(),
  );
});

test('o controller repassa o DTO e o id da rota à service; alterar junta o id ao corpo', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new TagController({
    criar: registrar('criar'), listar: registrar('listar'), recuperar: registrar('recuperar'),
    alterar: registrar('alterar'), excluir: registrar('excluir'), restaurar: registrar('restaurar'),
  } as never);

  await controller.criar({ nome: 'Infra', cor: '#abcdef' });
  await controller.listar();
  await controller.recuperar(3);
  await controller.alterar(3, { cor: '#ffffff' });
  await controller.excluir(3);
  await controller.restaurar(3);

  assert.deepEqual(chamadas, [
    ['criar', { nome: 'Infra', cor: '#abcdef' }],
    ['listar'],
    ['recuperar', { id: 3 }],
    ['alterar', { cor: '#ffffff', id: 3 }],
    ['excluir', { id: 3 }],
    ['restaurar', { id: 3 }],
  ]);
});
