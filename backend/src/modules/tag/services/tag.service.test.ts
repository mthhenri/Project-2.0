import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TagService } from './tag.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): TagService {
  const servico = Object.create(TagService.prototype) as Record<string, unknown>;
  servico.tagRepositorio = repositorio;
  return servico as unknown as TagService;
}

test('restaurar: tag inexistente entre as excluídas lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluida: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: recusa quando já existe tag ativa com o mesmo nome e não chama a restauração', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
    validarNome: async () => true,
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
  assert.equal(restaurou, false);
});

test('restaurar: sem conflito reativa a tag e devolve o registro', async () => {
  const servico = criarServico({
    recuperarExcluida: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
    validarNome: async () => false,
    restaurar: async () => ({ id: 1, nome: 'Backend', cor: '#fff' }),
  });
  const resposta = await servico.restaurar({ id: 1 });
  assert.equal(resposta.sucesso, true);
  assert.equal(resposta.dados?.id, 1);
});
