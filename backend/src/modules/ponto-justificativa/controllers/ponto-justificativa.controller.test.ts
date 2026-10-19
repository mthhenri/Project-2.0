import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { PontoJustificativaController } from './ponto-justificativa.controller';

// A justificativa de ponto é inteira do gestor (task 82): a marca está no controller, vale para todas as rotas.

const rotas = () => rotasPorNome(PontoJustificativaController);

test('toda rota de justificativa é @GestorOnly (criar, listar e excluir)', () => {
  assert.deepEqual(Object.values(rotas()).map((rota) => rota.nome).sort(), ['criar', 'excluir', 'listar']);
  for (const rota of Object.values(rotas())) assert.equal(rota.gestorOnly, true, rota.nome);
});

test('nenhuma rota é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  assert.deepEqual(Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), ['DELETE :id', 'GET /', 'POST /']);
});

test('o controller repassa o DTO, o gestor do token e o id da URL', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new PontoJustificativaController({
    criar: registrar('criar'), listar: registrar('listar'), excluir: registrar('excluir'),
  } as never);
  const gestor = { sub: 1 } as never;

  await controller.criar({ usuarioId: 3 } as never, gestor);
  await controller.listar({ usuarioId: 3, ano: 2026, mes: 3 });
  await controller.excluir(8);

  assert.deepEqual(chamadas, [
    ['criar', { usuarioId: 3 }, gestor],
    ['listar', { usuarioId: 3, ano: 2026, mes: 3 }],
    ['excluir', { id: 8 }],
  ]);
});
