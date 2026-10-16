import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProjetoService } from './projeto.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): ProjetoService {
  const servico = Object.create(ProjetoService.prototype) as Record<string, unknown>;
  servico.projetoRepositorio = repositorio;
  return servico as unknown as ProjetoService;
}

test('restaurar: projeto inexistente entre os excluídos lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluido: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: recusa quando o código foi reutilizado por um projeto ativo', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 1, nome: 'A', codigo: 'PROJ-1', cor: '#fff' }),
    validarCodigo: async () => true,
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
  assert.equal(restaurou, false);
});

test('restaurar: com código livre reativa o projeto', async () => {
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 1, nome: 'A', codigo: 'PROJ-1', cor: '#fff' }),
    validarCodigo: async () => false,
    restaurar: async () => ({ id: 1, nome: 'A', codigo: 'PROJ-1', cor: '#fff' }),
  });
  assert.equal((await servico.restaurar({ id: 1 })).dados?.codigo, 'PROJ-1');
});
