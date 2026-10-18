import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';
import { CriarAtividadeExecutor } from './criar-atividade.executor';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function criar(opcoes: { possuiExecucao?: boolean } = {}) {
  const criadas: Record<string, unknown>[] = [];
  const excluidas: number[] = [];
  const servico = {
    criar: async (dto: Record<string, unknown>) => {
      criadas.push(dto);
      return { dados: { id: 31 } };
    },
    recuperar: async () => ({ dados: { id: 31 } }),
    excluir: async (dto: { id: number }) => {
      excluidas.push(dto.id);
    },
  };
  const repositorio = { possuiExecucao: async () => opcoes.possuiExecucao ?? false };
  const executor = new CriarAtividadeExecutor(servico as unknown as AtividadeService, repositorio as unknown as AtividadeRepository);
  return { executor, criadas, excluidas };
}

test('cria planejada, com a prioridade da proposta, pelo usuário do token', async () => {
  const { executor, criadas } = criar();
  const resultado = await executor.executar({ demandaId: 9, nome: 'Ajustar login', prioridade: 'URGENTE', demandaNome: 'Autenticação' }, USUARIO);
  assert.deepEqual(criadas[0], {
    demandaId: 9,
    nome: 'Ajustar login',
    status: TipoAtividadeStatusEnum.PLANEJADA,
    prioridade: TipoAtividadePrioridadeEnum.URGENTE,
  });
  assert.equal(resultado['atividadeId'], 31);
});

test('sem prioridade a atividade nasce INDEFINIDA', async () => {
  const { executor, criadas } = criar();
  await executor.executar({ demandaId: 9, nome: 'Ajustar login' }, USUARIO);
  assert.equal(criadas[0].prioridade, TipoAtividadePrioridadeEnum.INDEFINIDA);
});

test('os dados são validados (nome curto, prioridade inexistente, campo desconhecido)', () => {
  const { executor } = criar();
  assert.throws(() => executor.validar({ demandaId: 9, nome: 'ab' }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 9, nome: 'Ajustar login', prioridade: 'ENORME' }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 9, nome: 'Ajustar login', usuarioId: 2 }), BusinessException);
  assert.doesNotThrow(() => executor.validar({ demandaId: 9, nome: 'Ajustar login', prioridade: 'ALTA', demandaNome: 'X' }));
});

test('desfazer exclui a atividade enquanto ela não tem execuções', async () => {
  const { executor, excluidas } = criar();
  await executor.desfazer({ atividadeId: 31 }, USUARIO);
  assert.deepEqual(excluidas, [31]);
});

test('desfazer é recusado quando a atividade já tem execuções', async () => {
  const { executor, excluidas } = criar({ possuiExecucao: true });
  await assert.rejects(executor.desfazer({ atividadeId: 31 }, USUARIO), BusinessException);
  assert.deepEqual(excluidas, []);
});
