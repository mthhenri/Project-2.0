import { test } from 'node:test';
import * as assert from 'node:assert/strict';
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
