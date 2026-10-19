import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { CalendarioController } from './calendario.controller';

// SYSTEM.SPEC.md §14: "Cadastrar dia não útil" é do gestor; a leitura (listar, recuperar, verificar) é de qualquer autenticado.

const rotas = () => rotasPorNome(CalendarioController);

test('criar, alterar, excluir e restaurar são @GestorOnly', () => {
  for (const nome of ['criar', 'alterar', 'excluir', 'restaurar']) assert.equal(rotas()[nome].gestorOnly, true, nome);
});

test('listar, recuperar e verificar ficam abertos a qualquer autenticado', () => {
  for (const nome of ['listar', 'recuperar', 'verificarDiaUtil']) assert.equal(rotas()[nome].gestorOnly, false, nome);
});

test('nenhuma rota do calendário é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  assert.deepEqual(
    Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(),
    ['DELETE :id', 'GET :id', 'GET /', 'GET verificar', 'PATCH :id/restaurar', 'POST /', 'PUT :id'].sort(),
  );
});

test('o controller repassa o DTO e o id da rota à service; alterar junta o id ao corpo', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new CalendarioController({
    criar: registrar('criar'), listar: registrar('listar'), recuperar: registrar('recuperar'), alterar: registrar('alterar'),
    excluir: registrar('excluir'), restaurar: registrar('restaurar'), verificarDiaUtil: registrar('verificarDiaUtil'),
  } as never);

  await controller.criar({ diaData: '2026-12-25' } as never);
  await controller.verificarDiaUtil({ data: '2026-12-25' });
  await controller.listar();
  await controller.recuperar(3);
  await controller.alterar(3, { descricao: 'Novo' });
  await controller.excluir(3);
  await controller.restaurar(3);

  assert.deepEqual(chamadas, [
    ['criar', { diaData: '2026-12-25' }],
    ['verificarDiaUtil', '2026-12-25'],
    ['listar'],
    ['recuperar', { id: 3 }],
    ['alterar', { descricao: 'Novo', id: 3 }],
    ['excluir', { id: 3 }],
    ['restaurar', { id: 3 }],
  ]);
});
