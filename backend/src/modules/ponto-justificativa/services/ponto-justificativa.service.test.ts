import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PontoJustificativaService } from './ponto-justificativa.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// Regras da justificativa (task 82): usuário existe, horas <= jornada diária, uma por usuário e dia, soft delete.
// Quem pode chamar é o `@GestorOnly` do controller (ponto-justificativa.controller.test.ts); a service só valida o dado.
// Não existe "alterar" justificativa: o ciclo é criar e excluir.

const GESTOR = { sub: 1, login: 'g' } as never;
const DTO = { usuarioId: 3, diaData: '2026-03-02', nome: 'Consulta', descricao: 'Médica', horasCobertas: 4 };

function criarServico(sobrescrita: { usuario?: unknown; jaExiste?: boolean; justificativa?: unknown } = {}) {
  const gravacoes: Array<{ metodo: string; argumento: unknown }> = [];
  const servico = Object.create(PontoJustificativaService.prototype) as Record<string, unknown>;
  servico.usuarioRepositorio = {
    recuperar: async () => ('usuario' in sobrescrita ? sobrescrita.usuario : { id: 3, horasDiariasNecessarias: 8 }),
  };
  servico.pontoJustificativaRepositorio = {
    validarPorUsuarioEDia: async () => sobrescrita.jaExiste ?? false,
    inserir: async (argumento: unknown) => { gravacoes.push({ metodo: 'inserir', argumento }); return { id: 10 }; },
    listar: async (argumento: unknown) => [{ id: 10, argumento }],
    recuperar: async () => ('justificativa' in sobrescrita ? sobrescrita.justificativa : { id: 10 }),
    excluir: async (argumento: unknown) => { gravacoes.push({ metodo: 'excluir', argumento }); },
  };
  return { servico: servico as unknown as PontoJustificativaService, gravacoes };
}

test('criar: grava com o gestor do token como autor e devolve a justificativa criada', async () => {
  const { servico, gravacoes } = criarServico();
  const resposta = await servico.criar(DTO, GESTOR);
  assert.deepEqual(gravacoes, [{ metodo: 'inserir', argumento: { ...DTO, gestorId: 1 } }]);
  assert.equal(resposta.sucesso, true);
  assert.deepEqual(resposta.dados, { id: 10 });
});

test('criar: usuário inexistente é ResourceNotFoundException e nada é gravado', async () => {
  const { servico, gravacoes } = criarServico({ usuario: null });
  await assert.rejects(() => servico.criar(DTO, GESTOR), ResourceNotFoundException);
  assert.deepEqual(gravacoes, []);
});

test('criar: horas acima da jornada diária do usuário são recusadas; igual à jornada é aceita', async () => {
  const recusada = criarServico({ usuario: { id: 3, horasDiariasNecessarias: 6 } });
  await assert.rejects(() => recusada.servico.criar({ ...DTO, horasCobertas: 6.5 }, GESTOR), BusinessException);
  assert.deepEqual(recusada.gravacoes, []);

  const aceita = criarServico({ usuario: { id: 3, horasDiariasNecessarias: 6 } });
  await aceita.servico.criar({ ...DTO, horasCobertas: 6 }, GESTOR);
  assert.equal(aceita.gravacoes.length, 1);
});

test('criar: uma justificativa por usuário e dia; a segunda é recusada sem gravar', async () => {
  const { servico, gravacoes } = criarServico({ jaExiste: true });
  await assert.rejects(() => servico.criar(DTO, GESTOR), BusinessException);
  assert.deepEqual(gravacoes, []);
});

test('listar: repassa usuário, ano e mês ao repository', async () => {
  const { servico } = criarServico();
  const resposta = await servico.listar({ usuarioId: 3, ano: 2026, mes: 3 });
  assert.deepEqual(resposta.dados, [{ id: 10, argumento: { usuarioId: 3, ano: 2026, mes: 3 } }]);
});

test('excluir: soft delete pelo id; inexistente é ResourceNotFoundException e nada é excluído', async () => {
  const existente = criarServico();
  await existente.servico.excluir({ id: 10 });
  assert.deepEqual(existente.gravacoes, [{ metodo: 'excluir', argumento: { id: 10 } }]);

  const inexistente = criarServico({ justificativa: null });
  await assert.rejects(() => inexistente.servico.excluir({ id: 99 }), ResourceNotFoundException);
  assert.deepEqual(inexistente.gravacoes, []);
});
