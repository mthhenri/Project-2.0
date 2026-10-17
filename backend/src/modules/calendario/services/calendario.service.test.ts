import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { CalendarioService } from './calendario.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): CalendarioService {
  const servico = Object.create(CalendarioService.prototype) as Record<string, unknown>;
  servico.calendarioRepositorio = repositorio;
  return servico as unknown as CalendarioService;
}

test('restaurar: dia não útil inexistente entre os excluídos lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluido: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: reativa o dia não útil excluído', async () => {
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 1, diaData: '2026-12-25', descricao: 'Natal' }),
    restaurar: async () => ({ id: 1, diaData: '2026-12-25', descricao: 'Natal' }),
  });
  assert.equal((await servico.restaurar({ id: 1 })).dados?.descricao, 'Natal');
});
