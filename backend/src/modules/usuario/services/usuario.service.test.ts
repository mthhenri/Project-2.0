import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { UsuarioService } from './usuario.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): UsuarioService {
  const servico = Object.create(UsuarioService.prototype) as Record<string, unknown>;
  servico.usuarioRepositorio = repositorio;
  return servico as unknown as UsuarioService;
}

test('restaurar: usuário inexistente entre os excluídos lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluido: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }), ResourceNotFoundException);
});

test('restaurar: recusa quando o login foi reutilizado por um usuário ativo', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 1, login: 'joao', nomeCompleto: 'João' }),
    validarLogin: async () => true,
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }), BusinessException);
  assert.equal(restaurou, false);
});
