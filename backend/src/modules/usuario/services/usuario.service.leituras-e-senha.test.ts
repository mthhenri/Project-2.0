import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as bcrypt from 'bcrypt';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { UsuarioService } from './usuario.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

// Complemento do usuario.service.test.ts: criar, listar, recuperar e troca de senha (SYSTEM.SPEC.md §14, "Gerenciar usuários").

const GESTOR = { sub: 9, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const ADMINISTRADOR = { sub: 1, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const DADOS_CRIAR = {
  login: 'ana.souza', senhaNaoEncriptada: 'Senha#12345', nomeCompleto: 'Ana Souza', cargoTitulo: 'Dev',
  tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 8,
};

function criarServico(repositorio: Record<string, unknown>): UsuarioService {
  const servico = Object.create(UsuarioService.prototype) as Record<string, unknown>;
  servico.usuarioRepositorio = repositorio;
  return servico as unknown as UsuarioService;
}

const USUARIO_COMPLETO = {
  id: 3, login: 'dev', senhaEncriptada: 'hash-que-nao-pode-sair', nomeCompleto: 'Dev', cargoTitulo: 'Dev',
  horasDiariasNecessarias: 8, tipo: TipoUsuarioEnum.DESENVOLVEDOR, status: TipoUsuarioStatusEnum.ATIVO, createdDate: new Date('2026-01-15'),
};

test('criar: login já usado entre os ativos é recusado e nada é gravado', async () => {
  let inseriu = false;
  const servico = criarServico({ validarLogin: async () => true, inserir: async () => { inseriu = true; } });
  await assert.rejects(() => servico.criar(DADOS_CRIAR, GESTOR), (erro: BusinessException) => {
    assert.equal((erro.getResponse() as { mensagem: string }).mensagem, 'Login já está em uso');
    return true;
  });
  assert.equal(inseriu, false);
});

test('criar: a senha vai ao repository com hash bcrypt (nunca em texto) e a resposta não traz senha', async () => {
  let gravado: { senhaEncriptada: string } | undefined;
  const servico = criarServico({
    validarLogin: async () => false,
    inserir: async (dados: { senhaEncriptada: string }) => { gravado = dados; return { id: 10, login: 'ana.souza', nomeCompleto: 'Ana Souza' }; },
  });
  const resposta = await servico.criar(DADOS_CRIAR, GESTOR);

  assert.notEqual(gravado!.senhaEncriptada, 'Senha#12345');
  assert.equal(await bcrypt.compare('Senha#12345', gravado!.senhaEncriptada), true);
  const texto = JSON.stringify(resposta);
  assert.equal(texto.includes('Senha#12345'), false);
  assert.equal(texto.toLowerCase().includes('senha'), false);
  assert.equal(resposta.sucesso, true);
});

test('criar: o repository recebe o status inicial só por ele (a service não deixa o chamador escolher)', async () => {
  let gravado: Record<string, unknown> | undefined;
  const servico = criarServico({ validarLogin: async () => false, inserir: async (dados: Record<string, unknown>) => { gravado = dados; return {}; } });
  await servico.criar(DADOS_CRIAR, GESTOR);
  assert.equal('status' in gravado!, false);
});

test('listar: com paginação calcula total de páginas; com allRows devolve tudo numa página só', async () => {
  const itens = [{ id: 1 }, { id: 2 }];
  const servico = criarServico({ listar: async () => ({ itens, total: 45 }) });

  const paginada = (await servico.listar({ pagina: 2, itensPorPagina: 20 })).dados!;
  assert.deepEqual(
    { totalItens: paginada.totalItens, paginaAtual: paginada.paginaAtual, itensPorPagina: paginada.itensPorPagina, totalPaginas: paginada.totalPaginas },
    { totalItens: 45, paginaAtual: 2, itensPorPagina: 20, totalPaginas: 3 },
  );

  const padrao = (await servico.listar({})).dados!;
  assert.equal(padrao.paginaAtual, 1);
  assert.equal(padrao.itensPorPagina, 20);

  const tudo = (await servico.listar({ allRows: true })).dados!;
  assert.deepEqual({ totalItens: tudo.totalItens, totalPaginas: tudo.totalPaginas, paginaAtual: tudo.paginaAtual }, { totalItens: 2, totalPaginas: 1, paginaAtual: 1 });
});

test('listar: repassa os filtros ao repository', async () => {
  let recebido: unknown;
  const servico = criarServico({ listar: async (filtros: unknown) => { recebido = filtros; return { itens: [], total: 0 }; } });
  const filtros = { tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.ATIVO, busca: 'ana' };
  await servico.listar(filtros);
  assert.deepEqual(recebido, filtros);
});

test('recuperar: desenvolvedor vê o próprio perfil, não o de outro', async () => {
  const servico = criarServico({ recuperar: async () => USUARIO_COMPLETO });
  assert.equal((await servico.recuperar({ id: 3 }, DESENVOLVEDOR)).dados?.id, 3);
  await assert.rejects(() => servico.recuperar({ id: 4 }, DESENVOLVEDOR), UnauthorizedAccessException);
});

test('recuperar: gestor e administrador veem qualquer perfil', async () => {
  const servico = criarServico({ recuperar: async () => USUARIO_COMPLETO });
  assert.equal((await servico.recuperar({ id: 3 }, GESTOR)).sucesso, true);
  assert.equal((await servico.recuperar({ id: 3 }, ADMINISTRADOR)).sucesso, true);
});

test('recuperar: a resposta nunca traz a senha encriptada', async () => {
  const servico = criarServico({ recuperar: async () => USUARIO_COMPLETO });
  const resposta = await servico.recuperar({ id: 3 }, GESTOR);
  assert.equal(JSON.stringify(resposta).includes('hash-que-nao-pode-sair'), false);
  assert.equal('senhaEncriptada' in resposta.dados!, false);
});

test('recuperar: usuário inexistente (ou excluído, que o repository não devolve) lança ResourceNotFoundException', async () => {
  const servico = criarServico({ recuperar: async () => null });
  await assert.rejects(() => servico.recuperar({ id: 99 }, GESTOR), ResourceNotFoundException);
});

test('alterar, excluir e alterarSenha de usuário inexistente lançam ResourceNotFoundException e não gravam', async () => {
  const chamadas: string[] = [];
  const servico = criarServico({
    recuperar: async () => null,
    alterar: async () => { chamadas.push('alterar'); },
    excluir: async () => { chamadas.push('excluir'); },
    alterarSenha: async () => { chamadas.push('alterarSenha'); },
  });
  await assert.rejects(() => servico.alterar({ id: 99, nomeCompleto: 'X' }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => servico.excluir({ id: 99 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => servico.alterarSenha({ id: 99, senhaNova: 'Senha#12345' } as never, GESTOR), ResourceNotFoundException);
  assert.deepEqual(chamadas, []);
});

test('alterarSenha: grava só o hash da nova senha, para o próprio gestor e para um desenvolvedor', async () => {
  const gravados: Array<{ id: number; senhaEncriptada: string }> = [];
  const servico = criarServico({
    recuperar: async ({ id }: { id: number }) => ({ ...USUARIO_COMPLETO, id, tipo: id === 9 ? TipoUsuarioEnum.GESTOR : TipoUsuarioEnum.DESENVOLVEDOR }),
    alterarSenha: async (dados: { id: number; senhaEncriptada: string }) => { gravados.push(dados); },
  });

  await servico.alterarSenha({ id: 9, senhaNova: 'Nova#Senha123' } as never, GESTOR);
  await servico.alterarSenha({ id: 3, senhaNova: 'Outra#Senha123' } as never, GESTOR);

  assert.deepEqual(gravados.map((dados) => dados.id), [9, 3]);
  assert.equal(await bcrypt.compare('Nova#Senha123', gravados[0].senhaEncriptada), true);
  assert.equal(await bcrypt.compare('Outra#Senha123', gravados[1].senhaEncriptada), true);
  assert.equal(gravados.some((dados) => dados.senhaEncriptada.includes('Senha#')), false);
});

test('alterarSenha: a resposta não devolve a senha', async () => {
  const servico = criarServico({ recuperar: async () => USUARIO_COMPLETO, alterarSenha: async () => undefined });
  const resposta = await servico.alterarSenha({ id: 3, senhaNova: 'Nova#Senha123' } as never, GESTOR);
  assert.equal(JSON.stringify(resposta).includes('Nova#Senha123'), false);
});

test('restaurar: login livre restaura e devolve o usuário restaurado', async () => {
  const servico = criarServico({
    recuperarExcluido: async () => ({ id: 3, login: 'dev', nomeCompleto: 'Dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR }),
    validarLogin: async () => false,
    restaurar: async () => ({ id: 3, login: 'dev', nomeCompleto: 'Dev' }),
  });
  assert.equal((await servico.restaurar({ id: 3 }, GESTOR)).dados?.id, 3);
});
