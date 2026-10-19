import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { rotasPorNome } from '../../../testes/rotas-do-controller';
import { ExecucaoController } from './execucao.controller';

// SYSTEM.SPEC.md §14: registrar manualmente e excluir execução são do gestor; iniciar, encerrar, alterar, listar e recuperar ficam abertos a
// qualquer autenticado e a service decide por tipo e dono da atividade ("ver execuções de todos" e "editar execuções de outros" são do gestor).

const rotas = () => rotasPorNome(ExecucaoController);

test('rotas @GestorOnly: só registrar e excluir', () => {
  const somenteGestor = Object.values(rotas()).filter((rota) => rota.gestorOnly).map((rota) => rota.nome).sort();
  assert.deepEqual(somenteGestor, ['excluir', 'registrar']);
});

test('iniciar, encerrar, alterar, listar, recuperar e ativa ficam abertos: a service decide por tipo e dono', () => {
  for (const nome of ['iniciar', 'encerrar', 'alterar', 'listar', 'recuperar', 'recuperarAtiva']) {
    assert.equal(rotas()[nome].gestorOnly, false, nome);
  }
});

test('nenhuma rota de execução é pública nem exclusiva de administrador', () => {
  for (const rota of Object.values(rotas())) {
    assert.equal(rota.publica, false, rota.nome);
    assert.equal(rota.administradorOnly, false, rota.nome);
  }
});

test('verbos e caminhos de todas as rotas', () => {
  const esperado = ['POST /', 'POST registro', 'GET /', 'GET ativa', 'GET :id', 'PATCH :id/encerrar', 'PUT :id', 'DELETE :id'];
  assert.deepEqual(Object.values(rotas()).map((rota) => `${rota.verbo} ${rota.caminho}`).sort(), [...esperado].sort());
});

test('o controller repassa o usuário do token e junta o id da URL ao corpo', async () => {
  const chamadas: unknown[][] = [];
  const registrar = (nome: string) => async (...argumentos: unknown[]) => { chamadas.push([nome, ...argumentos]); return null; };
  const controller = new ExecucaoController({
    iniciar: registrar('iniciar'), registrar: registrar('registrar'), listar: registrar('listar'), recuperarAtiva: registrar('recuperarAtiva'),
    recuperar: registrar('recuperar'), encerrar: registrar('encerrar'), alterar: registrar('alterar'), excluir: registrar('excluir'),
  } as never);
  const usuario = { sub: 3 } as never;

  await controller.iniciar({ atividadeId: 1, descricao: 'x' } as never, usuario);
  await controller.registrar({ atividadeId: 1 } as never, usuario);
  await controller.listar({} as never, usuario);
  await controller.recuperarAtiva(usuario);
  await controller.recuperar(5, usuario);
  await controller.encerrar(5, { descricao: 'feito' } as never, usuario);
  await controller.alterar(5, { descricao: 'novo' } as never, usuario);
  await controller.excluir(5, usuario);

  assert.ok(chamadas.every((chamada) => chamada[chamada.length - 1] === usuario), 'toda chamada leva o usuário do token');
  assert.deepEqual(chamadas.find((chamada) => chamada[0] === 'encerrar')?.[1], { id: 5, descricao: 'feito' });
  assert.deepEqual(chamadas.find((chamada) => chamada[0] === 'alterar')?.[1], { id: 5, descricao: 'novo' });
  assert.deepEqual(chamadas.find((chamada) => chamada[0] === 'recuperar')?.[1], { id: 5 });
  assert.deepEqual(chamadas.find((chamada) => chamada[0] === 'excluir')?.[1], { id: 5 });
});
