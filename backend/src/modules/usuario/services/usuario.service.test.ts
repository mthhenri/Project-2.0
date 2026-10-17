import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { UsuarioService } from './usuario.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
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

// Permanência do último gestor ativo (P-002): rebaixar, inativar e excluir passam pela mesma guarda.
const GESTOR_LOGADO = { sub: 1, tipo: TipoUsuarioEnum.GESTOR } as never;

function criarRepositorioDeGestores(alvo: { id: number; tipo: TipoUsuarioEnum; status: TipoUsuarioStatusEnum }, gestoresAtivos: number[]) {
  const chamadas: string[] = [];
  return {
    chamadas,
    recuperar: async () => alvo,
    listarGestoresAtivos: async () => gestoresAtivos.map((id) => ({ id })),
    alterar: async () => { chamadas.push('alterar'); return {}; },
    excluir: async () => { chamadas.push('excluir'); },
  };
}

const GESTOR_ATIVO = { id: 2, tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO };

test('alterar: inativar o único gestor ativo é recusado', async () => {
  const repositorio = criarRepositorioDeGestores(GESTOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await assert.rejects(
    () => servico.alterar({ id: 2, status: TipoUsuarioStatusEnum.INATIVO }, GESTOR_LOGADO),
    BusinessException,
  );
  assert.deepEqual(repositorio.chamadas, []);
});

test('alterar: inativar um gestor quando há outro gestor ativo é permitido', async () => {
  const repositorio = criarRepositorioDeGestores(GESTOR_ATIVO, [1, 2]);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 2, status: TipoUsuarioStatusEnum.INATIVO }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: rebaixar o único gestor ativo continua recusado', async () => {
  const repositorio = criarRepositorioDeGestores(GESTOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await assert.rejects(
    () => servico.alterar({ id: 2, tipo: TipoUsuarioEnum.DESENVOLVEDOR }, GESTOR_LOGADO),
    BusinessException,
  );
});

test('alterar: gestor já inativo pode ser alterado mesmo sem outro gestor ativo', async () => {
  const repositorio = criarRepositorioDeGestores({ ...GESTOR_ATIVO, status: TipoUsuarioStatusEnum.INATIVO }, []);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 2, status: TipoUsuarioStatusEnum.INATIVO }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: reativar ou editar o nome do único gestor não aciona a guarda', async () => {
  const repositorio = criarRepositorioDeGestores(GESTOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 2, nomeCompleto: 'Novo Nome', status: TipoUsuarioStatusEnum.ATIVO }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: inativar um desenvolvedor nunca depende de gestores', async () => {
  const repositorio = criarRepositorioDeGestores(
    { id: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO }, [],
  );
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 3, status: TipoUsuarioStatusEnum.INATIVO }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('excluir: o único gestor ativo não pode ser excluído', async () => {
  const repositorio = criarRepositorioDeGestores(GESTOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.excluir({ id: 2 }), BusinessException);
  assert.deepEqual(repositorio.chamadas, []);
});

test('excluir: gestor com outro gestor ativo e desenvolvedor são excluídos normalmente', async () => {
  const comOutro = criarRepositorioDeGestores(GESTOR_ATIVO, [1, 2]);
  await criarServico(comOutro).excluir({ id: 2 });
  assert.deepEqual(comOutro.chamadas, ['excluir']);

  const desenvolvedor = criarRepositorioDeGestores(
    { id: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO }, [],
  );
  await criarServico(desenvolvedor).excluir({ id: 3 });
  assert.deepEqual(desenvolvedor.chamadas, ['excluir']);
});
