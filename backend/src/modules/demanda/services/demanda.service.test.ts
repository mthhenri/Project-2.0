import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { LIMITE_PADRAO_DEMANDAS_EXECUTADAS, TipoUsuarioEnum } from '@project20/shared';
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

test('listarExecutadas: sempre as do token; o desenvolvedor só as de que é membro, o gestor sem esse filtro; limite padrão quando o pedido não diz', async () => {
  const chamadas: unknown[] = [];
  const servico = criarServico({ listarExecutadas: async (dto: unknown) => { chamadas.push(dto); return []; } });

  await servico.listarExecutadas({}, { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never);
  await servico.listarExecutadas({ limite: 5 }, { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never);
  await servico.listarExecutadas({}, { sub: 2, login: 'a', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never);

  assert.deepEqual(chamadas, [
    { usuarioId: 7, apenasMembro: true, limite: LIMITE_PADRAO_DEMANDAS_EXECUTADAS },
    { usuarioId: 1, apenasMembro: false, limite: 5 },
    { usuarioId: 2, apenasMembro: false, limite: LIMITE_PADRAO_DEMANDAS_EXECUTADAS },
  ]);
});
