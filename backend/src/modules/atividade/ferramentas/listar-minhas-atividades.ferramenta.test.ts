import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AtividadeListarDto, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { AtividadeService } from '../services/atividade.service';
import { LIMITE_ATIVIDADES_DA_FERRAMENTA, ListarMinhasAtividadesFerramenta } from './listar-minhas-atividades.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function atividade(id: number, parcial: Record<string, unknown> = {}) {
  return {
    id,
    nome: `Atividade ${id}`,
    status: TipoAtividadeStatusEnum.DESENVOLVENDO,
    prioridade: { codigo: 'ALTA', descricao: 'Alta', ordem: 2, cor: '#f97316' },
    demandaId: 3,
    nomeDemanda: 'Autenticação',
    nomeProjeto: 'Loja',
    execucaoAtivaId: null,
    totalMinutosExecutados: 15,
    ...parcial,
  };
}

function criar(itens: unknown[], totalItens = itens.length) {
  const chamadas: { filtros: AtividadeListarDto; usuarioId: number }[] = [];
  const servico = {
    listar: async (filtros: AtividadeListarDto, usuarioAtivo: { sub: number }) => {
      chamadas.push({ filtros, usuarioId: usuarioAtivo.sub });
      return { sucesso: true, dados: { itens, totalItens }, mensagem: '' };
    },
  };
  return { ferramenta: new ListarMinhasAtividadesFerramenta(servico as unknown as AtividadeService), chamadas };
}

test('lista só as do próprio usuário e só as em aberto, no limite da ferramenta', async () => {
  const { ferramenta, chamadas } = criar([atividade(1)]);
  await ferramenta.executar({}, USUARIO);
  assert.equal(chamadas[0].filtros.usuarioId, 7);
  assert.deepEqual(chamadas[0].filtros.status, [TipoAtividadeStatusEnum.PLANEJADA, TipoAtividadeStatusEnum.PENDENTE, TipoAtividadeStatusEnum.DESENVOLVENDO]);
  assert.equal(chamadas[0].filtros.itensPorPagina, LIMITE_ATIVIDADES_DA_FERRAMENTA);
});

test('incluirDesenvolvidas tira o filtro de status, mas nunca o do dono', async () => {
  const { ferramenta, chamadas } = criar([]);
  await ferramenta.executar({ incluirDesenvolvidas: true }, USUARIO);
  assert.equal(chamadas[0].filtros.status, undefined);
  assert.equal(chamadas[0].filtros.usuarioId, 7);
});

test('resume cada atividade e mantém a ordem que a service devolve (prioridade)', async () => {
  const { ferramenta } = criar([
    atividade(1, { prioridade: { codigo: 'URGENTE', descricao: 'Urgente', ordem: 1, cor: '#dc2626' }, execucaoAtivaId: 55 }),
    atividade(2),
  ]);
  const resultado = await ferramenta.executar({}, USUARIO);
  assert.deepEqual(resultado.atividades.map((item) => [item.id, item.prioridade, item.emExecucao]), [[1, 'Urgente', true], [2, 'Alta', false]]);
  assert.equal(resultado.atividades[0].demanda, 'Autenticação');
  assert.equal(resultado.atividades[0].demandaId, 3);
  assert.equal(resultado.haMais, false);
});

test('avisa que há mais quando o total passa do que cabe', async () => {
  const { ferramenta } = criar([atividade(1), atividade(2)], 41);
  const resultado = await ferramenta.executar({}, USUARIO);
  assert.equal(resultado.total, 41);
  assert.equal(resultado.haMais, true);
});
