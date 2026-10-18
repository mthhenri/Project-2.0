import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { AtividadeService } from './atividade.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): AtividadeService {
  const servico = Object.create(AtividadeService.prototype) as Record<string, unknown>;
  servico.atividadeRepositorio = repositorio;
  return servico as unknown as AtividadeService;
}

test('restaurar: atividade inexistente entre as excluídas lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluida: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: recusa quando a demanda da atividade continua excluída', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, demandaId: 9, nome: 'A', demandaAtiva: false }),
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
  assert.equal(restaurou, false);
});

test('restaurar: com a demanda ativa reativa a atividade', async () => {
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, demandaId: 9, nome: 'A', demandaAtiva: true }),
    restaurar: async () => ({ id: 1, demandaId: 9, nome: 'A' }),
  });
  assert.equal((await servico.restaurar({ id: 1 })).dados?.id, 1);
});

// criar(): a prioridade que não vem no pedido é INDEFINIDA (a service fornece o valor, o banco não tem DEFAULT).
function criarServicoDeCriacao(inseridas: Record<string, unknown>[]): AtividadeService {
  const servico = Object.create(AtividadeService.prototype) as Record<string, unknown>;
  servico.demandaRepositorio = { recuperar: async () => ({ id: 9 }) };
  servico.tagRepositorio = {};
  servico.atividadeRepositorio = {
    inserir: async (dados: Record<string, unknown>) => {
      inseridas.push(dados);
      return { id: 1, ...dados };
    },
  };
  return servico as unknown as AtividadeService;
}

const GESTOR_ATIVO = { sub: 2, tipo: TipoUsuarioEnum.GESTOR } as never;

test('criar: sem prioridade informada a atividade nasce INDEFINIDA', async () => {
  const inseridas: Record<string, unknown>[] = [];
  await criarServicoDeCriacao(inseridas).criar({ demandaId: 9, nome: 'Ajustar login', status: TipoAtividadeStatusEnum.PLANEJADA }, GESTOR_ATIVO);
  assert.equal(inseridas[0].prioridade, TipoAtividadePrioridadeEnum.INDEFINIDA);
});

test('criar: a prioridade informada é a gravada', async () => {
  const inseridas: Record<string, unknown>[] = [];
  await criarServicoDeCriacao(inseridas).criar(
    { demandaId: 9, nome: 'Ajustar login', status: TipoAtividadeStatusEnum.PLANEJADA, prioridade: TipoAtividadePrioridadeEnum.URGENTE },
    GESTOR_ATIVO,
  );
  assert.equal(inseridas[0].prioridade, TipoAtividadePrioridadeEnum.URGENTE);
});
