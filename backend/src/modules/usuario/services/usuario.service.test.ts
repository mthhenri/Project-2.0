import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { UsuarioService } from './usuario.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';

const ADMINISTRADOR_LOGADO = { sub: 1, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const GESTOR_LOGADO = { sub: 9, tipo: TipoUsuarioEnum.GESTOR } as never;

// restaurar(): regras do desfazer exclusão, sem banco — o repositório é um dublê que registra as chamadas.
function criarServico(repositorio: Record<string, unknown>): UsuarioService {
  const servico = Object.create(UsuarioService.prototype) as Record<string, unknown>;
  servico.usuarioRepositorio = repositorio;
  return servico as unknown as UsuarioService;
}

test('restaurar: usuário inexistente entre os excluídos lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperarExcluido: async () => null });
  await assert.rejects(() => servico.restaurar({ id: 1 }, ADMINISTRADOR_LOGADO), ResourceNotFoundException);
});

test('restaurar: recusa quando o login foi reutilizado por um usuário ativo', async () => {
  let restaurou = false;
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 1, login: 'joao', nomeCompleto: 'João' }),
    validarLogin: async () => true,
    restaurar: async () => { restaurou = true; },
  });
  await assert.rejects(() => servico.restaurar({ id: 1 }, ADMINISTRADOR_LOGADO), BusinessException);
  assert.equal(restaurou, false);
});

// Permanência do último administrador ativo (substitui a guarda de gestor, P-002): rebaixar, inativar e
// excluir passam pela mesma guarda.
function criarRepositorioDeUsuarios(alvo: { id: number; tipo: TipoUsuarioEnum; status: TipoUsuarioStatusEnum }, administradoresAtivos: number[]) {
  const chamadas: string[] = [];
  return {
    chamadas,
    recuperar: async () => alvo,
    recuperarExcluido: async () => alvo,
    validarLogin: async () => false,
    listarAdministradoresAtivos: async () => administradoresAtivos.map((id) => ({ id })),
    alterar: async () => { chamadas.push('alterar'); return {}; },
    excluir: async () => { chamadas.push('excluir'); },
    restaurar: async () => { chamadas.push('restaurar'); return {}; },
    alterarSenha: async () => { chamadas.push('alterarSenha'); },
    inserir: async () => { chamadas.push('inserir'); return {}; },
  };
}

const ADMINISTRADOR_ATIVO = { id: 2, tipo: TipoUsuarioEnum.ADMINISTRADOR, status: TipoUsuarioStatusEnum.ATIVO };
const GESTOR_ATIVO = { id: 4, tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO };
const DESENVOLVEDOR_ATIVO = { id: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO };

test('alterar: inativar o único administrador ativo é recusado', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await assert.rejects(
    () => servico.alterar({ id: 2, status: TipoUsuarioStatusEnum.INATIVO }, ADMINISTRADOR_LOGADO),
    BusinessException,
  );
  assert.deepEqual(repositorio.chamadas, []);
});

test('alterar: inativar um administrador quando há outro administrador ativo é permitido', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [1, 2]);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 2, status: TipoUsuarioStatusEnum.INATIVO }, ADMINISTRADOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: rebaixar o único administrador ativo é recusado', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await assert.rejects(
    () => servico.alterar({ id: 2, tipo: TipoUsuarioEnum.GESTOR }, ADMINISTRADOR_LOGADO),
    BusinessException,
  );
});

test('alterar: administrador pode se rebaixar havendo outro administrador ativo', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [1, 2]);
  const servico = criarServico({ ...repositorio });
  await servico.alterar({ id: 2, tipo: TipoUsuarioEnum.GESTOR }, { sub: 2, tipo: TipoUsuarioEnum.ADMINISTRADOR } as never);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: administrador já inativo pode ser alterado mesmo sem outro administrador ativo', async () => {
  const repositorio = criarRepositorioDeUsuarios({ ...ADMINISTRADOR_ATIVO, status: TipoUsuarioStatusEnum.INATIVO }, []);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 2, status: TipoUsuarioStatusEnum.INATIVO }, ADMINISTRADOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: editar o nome do único administrador não aciona a guarda', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 2, nomeCompleto: 'Novo Nome', status: TipoUsuarioStatusEnum.ATIVO }, ADMINISTRADOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: gestor deixa de ser obrigatório — inativar o único gestor ativo é permitido', async () => {
  const repositorio = criarRepositorioDeUsuarios(GESTOR_ATIVO, [1]);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 4, status: TipoUsuarioStatusEnum.INATIVO }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: gestor não pode rebaixar a si mesmo', async () => {
  const repositorio = criarRepositorioDeUsuarios({ ...GESTOR_ATIVO, id: 9 }, [1]);
  const servico = criarServico(repositorio);
  await assert.rejects(
    () => servico.alterar({ id: 9, tipo: TipoUsuarioEnum.DESENVOLVEDOR }, GESTOR_LOGADO),
    BusinessException,
  );
});

test('alterar: inativar um desenvolvedor nunca depende de administradores', async () => {
  const repositorio = criarRepositorioDeUsuarios(DESENVOLVEDOR_ATIVO, []);
  const servico = criarServico(repositorio);
  await servico.alterar({ id: 3, status: TipoUsuarioStatusEnum.INATIVO }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('excluir: o único administrador ativo não pode ser excluído', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [2]);
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.excluir({ id: 2 }, ADMINISTRADOR_LOGADO), BusinessException);
  assert.deepEqual(repositorio.chamadas, []);
});

test('excluir: administrador com outro administrador ativo, gestor e desenvolvedor são excluídos normalmente', async () => {
  const comOutro = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [1, 2]);
  await criarServico(comOutro).excluir({ id: 2 }, ADMINISTRADOR_LOGADO);
  assert.deepEqual(comOutro.chamadas, ['excluir']);

  const gestor = criarRepositorioDeUsuarios(GESTOR_ATIVO, [1]);
  await criarServico(gestor).excluir({ id: 4 }, GESTOR_LOGADO);
  assert.deepEqual(gestor.chamadas, ['excluir']);

  const desenvolvedor = criarRepositorioDeUsuarios(DESENVOLVEDOR_ATIVO, []);
  await criarServico(desenvolvedor).excluir({ id: 3 }, GESTOR_LOGADO);
  assert.deepEqual(desenvolvedor.chamadas, ['excluir']);
});

// Gestor não gerencia administrador (criar, promover, alterar, excluir, restaurar, trocar senha).
test('gestor não cria administrador, mas administrador cria', async () => {
  const dto = {
    login: 'novo.admin', senhaNaoEncriptada: 'Senha#12345', nomeCompleto: 'Novo Admin',
    cargoTitulo: 'Admin', tipo: TipoUsuarioEnum.ADMINISTRADOR, horasDiariasNecessarias: 8,
  };
  const negado = criarRepositorioDeUsuarios(DESENVOLVEDOR_ATIVO, []);
  await assert.rejects(() => criarServico(negado).criar(dto, GESTOR_LOGADO), UnauthorizedAccessException);
  assert.deepEqual(negado.chamadas, []);

  const permitido = criarRepositorioDeUsuarios(DESENVOLVEDOR_ATIVO, []);
  await criarServico(permitido).criar(dto, ADMINISTRADOR_LOGADO);
  assert.deepEqual(permitido.chamadas, ['inserir']);
});

test('gestor continua criando gestor e desenvolvedor', async () => {
  const repositorio = criarRepositorioDeUsuarios(DESENVOLVEDOR_ATIVO, []);
  const base = { login: 'x.y', senhaNaoEncriptada: 'Senha#12345', nomeCompleto: 'X Y', cargoTitulo: 'Cargo', horasDiariasNecessarias: 8 };
  await criarServico(repositorio).criar({ ...base, tipo: TipoUsuarioEnum.GESTOR }, GESTOR_LOGADO);
  await criarServico(repositorio).criar({ ...base, tipo: TipoUsuarioEnum.DESENVOLVEDOR }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['inserir', 'inserir']);
});

// Só gestor e administrador alteram usuários; o desenvolvedor não altera ninguém, nem o próprio perfil (o pad tem rota própria).
test('desenvolvedor não altera usuário nenhum, nem o próprio perfil', async () => {
  const repositorio = criarRepositorioDeUsuarios({ ...DESENVOLVEDOR_ATIVO, id: 3 }, [1]);
  const servico = criarServico(repositorio);
  const desenvolvedorLogado = { sub: 3, tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
  await assert.rejects(() => servico.alterar({ id: 3, nomeCompleto: 'Outro Nome' }, desenvolvedorLogado), UnauthorizedAccessException);
  await assert.rejects(() => servico.alterar({ id: 3, cargoTitulo: 'Outro Cargo' }, desenvolvedorLogado), UnauthorizedAccessException);
  await assert.rejects(() => servico.alterar({ id: 3, tipo: TipoUsuarioEnum.GESTOR }, desenvolvedorLogado), UnauthorizedAccessException);
  await assert.rejects(() => servico.alterar({ id: 4, cargoTitulo: 'X' }, desenvolvedorLogado), UnauthorizedAccessException);
  assert.deepEqual(repositorio.chamadas, []);
});

test('gestor não promove ninguém a administrador', async () => {
  const repositorio = criarRepositorioDeUsuarios(GESTOR_ATIVO, [1]);
  await assert.rejects(
    () => criarServico(repositorio).alterar({ id: 4, tipo: TipoUsuarioEnum.ADMINISTRADOR }, GESTOR_LOGADO),
    UnauthorizedAccessException,
  );
  assert.deepEqual(repositorio.chamadas, []);
});

test('gestor não altera, exclui, restaura nem troca a senha de um administrador', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [1, 2]);
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.alterar({ id: 2, nomeCompleto: 'Outro Nome' }, GESTOR_LOGADO), UnauthorizedAccessException);
  await assert.rejects(() => servico.excluir({ id: 2 }, GESTOR_LOGADO), UnauthorizedAccessException);
  await assert.rejects(() => servico.restaurar({ id: 2 }, GESTOR_LOGADO), UnauthorizedAccessException);
  await assert.rejects(
    () => servico.alterarSenha({ id: 2, senhaNova: 'Senha#12345' } as never, GESTOR_LOGADO),
    UnauthorizedAccessException,
  );
  assert.deepEqual(repositorio.chamadas, []);
});

test('administrador altera a senha e restaura outro administrador', async () => {
  const repositorio = criarRepositorioDeUsuarios(ADMINISTRADOR_ATIVO, [1, 2]);
  const servico = criarServico(repositorio);
  await servico.alterarSenha({ id: 2, senhaNova: 'Senha#12345' } as never, ADMINISTRADOR_LOGADO);
  await servico.restaurar({ id: 2 }, ADMINISTRADOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterarSenha', 'restaurar']);
});

test('alterar: trocar o login por um já em uso é recusado', async () => {
  const repositorio = { ...criarRepositorioDeUsuarios({ ...DESENVOLVEDOR_ATIVO, login: 'ana.souza' } as never, [1]), validarLogin: async () => true };
  const servico = criarServico(repositorio);
  await assert.rejects(() => servico.alterar({ id: 3, login: 'joao.silva' }, GESTOR_LOGADO), BusinessException);
  assert.deepEqual(repositorio.chamadas, []);
});

test('alterar: trocar o login por um livre é permitido', async () => {
  const repositorio = criarRepositorioDeUsuarios({ ...DESENVOLVEDOR_ATIVO, login: 'ana.souza' } as never, [1]);
  await criarServico(repositorio).alterar({ id: 3, login: 'ana.lima' }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});

test('alterar: repetir o próprio login não consulta nem recusa', async () => {
  const repositorio = { ...criarRepositorioDeUsuarios({ ...DESENVOLVEDOR_ATIVO, login: 'ana.souza' } as never, [1]), validarLogin: async () => true };
  await criarServico(repositorio).alterar({ id: 3, login: 'ana.souza', nomeCompleto: 'Ana Souza' }, GESTOR_LOGADO);
  assert.deepEqual(repositorio.chamadas, ['alterar']);
});
