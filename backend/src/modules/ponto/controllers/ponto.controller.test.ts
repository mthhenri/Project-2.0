import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { PontoController } from './ponto.controller';

// SYSTEM.SPEC.md §12 `ponto` e §14: "todos hoje" é exclusivo de gestor; diário e mensal ficam abertos e a service
// limita o desenvolvedor ao próprio ponto (ponto.service.calculo.test.ts).

const rotas = () => rotasPorNome(PontoController);

test('/ponto/todos é @GestorOnly e as outras duas rotas ficam abertas a qualquer autenticado', () => {
  assert.equal(rotas().consultarTodos.gestorOnly, true);
  assert.equal(rotas().consultarDiario.gestorOnly, false);
  assert.equal(rotas().consultarMensal.gestorOnly, false);
});

test('nenhuma rota de ponto é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  assert.deepEqual(Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), ['GET diario', 'GET mensal', 'GET todos']);
});

test('o controller repassa o DTO e o usuário do token à service', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new PontoController({
    consultarDiario: registrar('consultarDiario'), consultarTodos: registrar('consultarTodos'), consultarMensal: registrar('consultarMensal'),
  } as never);
  const usuario = { sub: 3 } as never;

  await controller.consultarDiario({ data: '2026-03-02' }, usuario);
  await controller.consultarTodos({ data: '2026-03-02' }, usuario);
  await controller.consultarMensal({ ano: 2026, mes: 3 }, usuario);

  assert.deepEqual(chamadas, [
    ['consultarDiario', { data: '2026-03-02' }, usuario],
    ['consultarTodos', { data: '2026-03-02' }, usuario],
    ['consultarMensal', { ano: 2026, mes: 3 }, usuario],
  ]);
});
