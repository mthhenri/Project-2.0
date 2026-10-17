import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DemandaService } from './demanda.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): DemandaService {
  const servico = Object.create(DemandaService.prototype) as Record<string, unknown>;
  servico.demandaRepositorio = repositorio;
  return servico as unknown as DemandaService;
}

test('restaurar: demanda inexistente entre as excluídas lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluida: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: recusa quando o projeto da demanda foi excluído', async () => {
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, projetoId: 2, nome: 'D', projetoAtivo: false, paiAtivo: true }),
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
});

test('restaurar: recusa quando a demanda pai continua excluída (sem restauração em cascata)', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, projetoId: 2, nome: 'D', projetoAtivo: true, paiAtivo: false }),
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
  assert.equal(restaurou, false);
});

test('restaurar: com projeto e pai ativos reativa somente a demanda', async () => {
  let chamadas = 0;
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, projetoId: 2, nome: 'D', projetoAtivo: true, paiAtivo: true }),
    restaurar: async () => { chamadas += 1; return { id: 1, projetoId: 2, nome: 'D' }; },
  });
  assert.equal((await servico.restaurar({ id: 1 })).dados?.id, 1);
  assert.equal(chamadas, 1);
});
