import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoProjetoStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ProjetoRepository } from '../repositories/projeto.repository';
import { ProjetoService } from '../services/projeto.service';
import { CriarProjetoExecutor } from './criar-projeto.executor';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criar(opcoes: { possuiDemandas?: boolean } = {}) {
  const criados: Record<string, unknown>[] = [];
  const excluidos: number[] = [];
  const servico = {
    criar: async (dto: Record<string, unknown>) => {
      criados.push(dto);
      return { dados: { id: 12 } };
    },
    recuperar: async () => ({ dados: { id: 12 } }),
    excluir: async (dto: { id: number }) => {
      excluidos.push(dto.id);
    },
  };
  const repositorio = { possuiDemandas: async () => opcoes.possuiDemandas ?? false };
  const executor = new CriarProjetoExecutor(servico as unknown as ProjetoService, repositorio as unknown as ProjetoRepository);
  return { executor, criados, excluidos };
}

test('cria ativo, com o código em maiúsculas, pelo gestor', async () => {
  const { executor, criados } = criar();
  const resultado = await executor.executar({ nome: 'Loja online', codigo: 'lo', cor: '#6366f1' }, GESTOR);
  assert.deepEqual(criados[0], { nome: 'Loja online', codigo: 'LO', cor: '#6366f1', status: TipoProjetoStatusEnum.ATIVO, inicioData: undefined, previsaoFimData: undefined });
  assert.equal(resultado['projetoId'], 12);
});

test('desenvolvedor não cria nem desfaz projeto', async () => {
  const { executor, criados } = criar();
  await assert.rejects(executor.executar({ nome: 'Loja online', codigo: 'LO', cor: '#6366f1' }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(executor.desfazer({ projetoId: 12 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.equal(criados.length, 0);
});

test('desfazer exclui o projeto vazio e recusa o que já tem demandas', async () => {
  const vazio = criar();
  await vazio.executor.desfazer({ projetoId: 12 }, GESTOR);
  assert.deepEqual(vazio.excluidos, [12]);

  const comDemandas = criar({ possuiDemandas: true });
  await assert.rejects(comDemandas.executor.desfazer({ projetoId: 12 }, GESTOR), BusinessException);
  assert.deepEqual(comDemandas.excluidos, []);
});

test('os dados são validados (nome curto, cor inválida, campo desconhecido)', () => {
  const { executor } = criar();
  assert.throws(() => executor.validar({ nome: 'ab' }), BusinessException);
  assert.throws(() => executor.validar({ nome: 'Loja online', cor: 'azul' }), BusinessException);
  assert.throws(() => executor.validar({ nome: 'Loja online', status: 'CANCELADO' }), BusinessException);
});
