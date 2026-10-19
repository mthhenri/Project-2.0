import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAdministrador, criarDesenvolvedor, criarGestor, criarUsuario } from '../../../testes/fabricas';
import { UsuarioRepository } from './usuario.repository';

const DADOS_INSERIR = {
  login: 'novo.usuario', senhaEncriptada: 'hash-bcrypt', nomeCompleto: 'Novo Usuário', cargoTitulo: 'Cargo',
  tipo: TipoUsuarioEnum.DESENVOLVEDOR, horasDiariasNecessarias: 8,
};

testarComBanco('validarLogin: o login conta só entre os não excluídos', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const usuario = await criarDesenvolvedor(conexao, { login: 'login.unico' });
  assert.equal(await repositorio.validarLogin({ login: 'login.unico' }), true);
  assert.equal(await repositorio.validarLogin({ login: 'outro.login' }), false);

  await repositorio.excluir({ id: usuario.id });
  assert.equal(await repositorio.validarLogin({ login: 'login.unico' }), false, 'login de excluído fica livre');
});

testarComBanco('o índice único de login barra o segundo usuário ativo, mas aceita login de excluído', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  await criarDesenvolvedor(conexao, { login: 'repetido' });
  await assert.rejects(() => conexao.transaction((transacao) => criarDesenvolvedor(transacao, { login: 'repetido' })), /uix_usuario_login_ativo|duplicate/i);

  const antigo = await criarDesenvolvedor(conexao, { login: 'reaproveitado' });
  await repositorio.excluir({ id: antigo.id });
  const novo = await criarDesenvolvedor(conexao, { login: 'reaproveitado' });
  assert.ok(novo.id > antigo.id);
});

testarComBanco('recuperar por id traz a senha encriptada e os códigos de tipo e status; por login também', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const gestor = await criarGestor(conexao, { login: 'gestora.teste', senhaEncriptada: 'hash-da-gestora' });
  const porId = await repositorio.recuperar({ id: gestor.id });
  assert.equal(porId?.senhaEncriptada, 'hash-da-gestora');
  assert.equal(porId?.tipo, TipoUsuarioEnum.GESTOR);
  assert.equal(porId?.status, TipoUsuarioStatusEnum.ATIVO);
  assert.equal((await repositorio.recuperar({ login: 'gestora.teste' }))?.id, gestor.id);
});

testarComBanco('recuperar não devolve usuário excluído, mas devolve o inativo', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const inativo = await criarDesenvolvedor(conexao, { statusCodigo: 'INATIVO' });
  const excluido = await criarDesenvolvedor(conexao);
  await repositorio.excluir({ id: excluido.id });

  assert.equal((await repositorio.recuperar({ id: inativo.id }))?.status, TipoUsuarioStatusEnum.INATIVO);
  assert.equal(await repositorio.recuperar({ id: excluido.id }), null);
});

testarComBanco('listar: só não excluídos, ordenados por nome, com filtros de tipo, status e busca; sem senha no resultado', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const marca = 'zzlistagem';
  await criarDesenvolvedor(conexao, { login: `${marca}.b`, nomeCompleto: `${marca} Beto` });
  await criarGestor(conexao, { login: `${marca}.a`, nomeCompleto: `${marca} Ana` });
  await criarDesenvolvedor(conexao, { login: `${marca}.c`, nomeCompleto: `${marca} Caio`, statusCodigo: 'INATIVO' });
  const excluido = await criarDesenvolvedor(conexao, { login: `${marca}.d`, nomeCompleto: `${marca} Duda` });
  await repositorio.excluir({ id: excluido.id });

  const todos = await repositorio.listar({ busca: marca, allRows: true });
  assert.deepEqual(todos.itens.map((item) => item.nomeCompleto), [`${marca} Ana`, `${marca} Beto`, `${marca} Caio`]);
  assert.equal(todos.total, 3);
  assert.equal(JSON.stringify(todos.itens).toLowerCase().includes('senha'), false);

  const soDesenvolvedores = await repositorio.listar({ busca: marca, tipo: TipoUsuarioEnum.DESENVOLVEDOR, allRows: true });
  assert.deepEqual(soDesenvolvedores.itens.map((item) => item.login), [`${marca}.b`, `${marca}.c`]);

  const soAtivos = await repositorio.listar({ busca: marca, status: TipoUsuarioStatusEnum.ATIVO, allRows: true });
  assert.equal(soAtivos.total, 2);

  const porLogin = await repositorio.listar({ busca: `${marca}.a`, allRows: true });
  assert.deepEqual(porLogin.itens.map((item) => item.login), [`${marca}.a`]);
});

testarComBanco('listar pagina com LIMIT/OFFSET e o total é o de toda a busca', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const marca = 'zzpagina';
  for (const letra of ['a', 'b', 'c']) await criarDesenvolvedor(conexao, { login: `${marca}.${letra}`, nomeCompleto: `${marca} ${letra}` });
  const segunda = await repositorio.listar({ busca: marca, pagina: 2, itensPorPagina: 2 });
  assert.equal(segunda.total, 3);
  assert.deepEqual(segunda.itens.map((item) => item.login), [`${marca}.c`]);
});

testarComBanco('listar marca temAnotacoes só quando alguma seção do pad tem texto', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const marca = 'zzpad';
  const comPad = await criarDesenvolvedor(conexao, { login: `${marca}.com`, nomeCompleto: `${marca} Com` });
  await criarDesenvolvedor(conexao, { login: `${marca}.sem`, nomeCompleto: `${marca} Sem` });
  await conexao.raw(
    `INSERT INTO anotacao (usuario_id, tipo_anotacao_id, texto, created_date, updated_date, is_deleted)
     SELECT :usuarioId, tipo_anotacao.id, 'lembrar de algo', NOW(), NOW(), false
     FROM tipo_anotacao WHERE tipo_anotacao.is_deleted = false LIMIT 1`, { usuarioId: comPad.id });

  const itens = (await repositorio.listar({ busca: marca, allRows: true })).itens;
  assert.deepEqual(itens.map((item) => [item.login, item.temAnotacoes]), [[`${marca}.com`, true], [`${marca}.sem`, false]]);
});

testarComBanco('inserir cria o usuário ATIVO e as 5 seções do pad na mesma transação', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const criado = await repositorio.inserir(DADOS_INSERIR);
  assert.equal(criado.status, TipoUsuarioStatusEnum.ATIVO);
  assert.equal(criado.tipo, TipoUsuarioEnum.DESENVOLVEDOR);

  const { rows: pad } = await conexao.raw(
    'SELECT count(*)::int AS total FROM anotacao WHERE anotacao.usuario_id = :id AND anotacao.is_deleted = false', { id: criado.id });
  const { rows: tipos } = await conexao.raw('SELECT count(*)::int AS total FROM tipo_anotacao WHERE tipo_anotacao.is_deleted = false');
  assert.equal(pad[0].total, tipos[0].total);
  assert.equal(pad[0].total, 5);
});

testarComBanco('inserir é atômico: se a criação do pad falha, o usuário não fica gravado', async (conexao) => {
  // Repository que derruba o comando do pad (o INSERT em anotacao), que roda DEPOIS do INSERT do usuário na mesma transação.
  class RepositorioComPadQuebrado extends UsuarioRepository {
    protected override async executarComando(): Promise<void> {
      throw new Error('falha simulada no pad');
    }
  }
  const quebrado = new RepositorioComPadQuebrado(conexao as never);
  await assert.rejects(() => quebrado.inserir({ ...DADOS_INSERIR, login: 'atomico.falha' }), /falha simulada no pad/);
  assert.equal(await criarRepositorio(UsuarioRepository, conexao).validarLogin({ login: 'atomico.falha' }), false, 'o usuário foi desfeito junto');
});

testarComBanco('alterar muda só o que veio, inclusive tipo e status por código, e devolve os códigos', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const usuario = await criarDesenvolvedor(conexao, { nomeCompleto: 'Nome Antigo', cargoTitulo: 'Cargo Antigo' });
  const alterado = await repositorio.alterar({ id: usuario.id, nomeCompleto: 'Nome Novo', tipo: TipoUsuarioEnum.GESTOR, status: TipoUsuarioStatusEnum.INATIVO });
  assert.equal(alterado.nomeCompleto, 'Nome Novo');
  assert.equal(alterado.cargoTitulo, 'Cargo Antigo');
  assert.equal(alterado.tipo, TipoUsuarioEnum.GESTOR);
  assert.equal(alterado.status, TipoUsuarioStatusEnum.INATIVO);
});

testarComBanco('alterarSenha grava só a senha encriptada', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const usuario = await criarDesenvolvedor(conexao, { nomeCompleto: 'Mesma Pessoa' });
  await repositorio.alterarSenha({ id: usuario.id, senhaEncriptada: 'hash-novo' });
  const recuperado = await repositorio.recuperar({ id: usuario.id });
  assert.equal(recuperado?.senhaEncriptada, 'hash-novo');
  assert.equal(recuperado?.nomeCompleto, 'Mesma Pessoa');
});

testarComBanco('excluir faz soft delete e restaurar o desfaz; recuperarExcluido só enxerga o excluído', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const usuario = await criarGestor(conexao, { login: 'para.restaurar' });

  assert.equal(await repositorio.recuperarExcluido({ id: usuario.id }), null, 'ativo não conta como excluído');
  await repositorio.excluir({ id: usuario.id });
  const excluido = await repositorio.recuperarExcluido({ id: usuario.id });
  assert.equal(excluido?.login, 'para.restaurar');
  assert.equal(excluido?.tipo, TipoUsuarioEnum.GESTOR);
  const { rows } = await conexao.raw('SELECT is_deleted, deleted_date FROM usuario WHERE usuario.id = :id', { id: usuario.id });
  assert.equal(rows[0].is_deleted, true);
  assert.ok(rows[0].deleted_date instanceof Date);

  const restaurado = await repositorio.restaurar({ id: usuario.id });
  assert.equal(restaurado.login, 'para.restaurar');
  assert.equal((await repositorio.recuperar({ id: usuario.id }))?.id, usuario.id);
  const { rows: depois } = await conexao.raw('SELECT deleted_date FROM usuario WHERE usuario.id = :id', { id: usuario.id });
  assert.equal(depois[0].deleted_date, null);
});

testarComBanco('listarAdministradoresAtivos conta só administradores ativos e não excluídos', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const antes = (await repositorio.listarAdministradoresAtivos()).length;

  const ativo = await criarAdministrador(conexao);
  const inativo = await criarAdministrador(conexao, { statusCodigo: 'INATIVO' });
  const excluido = await criarAdministrador(conexao);
  await repositorio.excluir({ id: excluido.id });
  await criarGestor(conexao);
  await criarDesenvolvedor(conexao);

  const ids = (await repositorio.listarAdministradoresAtivos()).map((linha) => linha.id);
  assert.equal(ids.length, antes + 1);
  assert.ok(ids.includes(ativo.id));
  assert.ok(!ids.includes(inativo.id));
  assert.ok(!ids.includes(excluido.id));
});

testarComBanco('listarAtivosComMeta devolve só ativos não excluídos, ordenados por nome', async (conexao) => {
  const repositorio = criarRepositorio(UsuarioRepository, conexao);
  const marca = 'zzmeta';
  const b = await criarUsuario(conexao, { login: `${marca}.b`, nomeCompleto: `${marca} B`, horasDiariasNecessarias: 6 });
  const a = await criarUsuario(conexao, { login: `${marca}.a`, nomeCompleto: `${marca} A`, horasDiariasNecessarias: 8 });
  await criarUsuario(conexao, { login: `${marca}.i`, nomeCompleto: `${marca} I`, statusCodigo: 'INATIVO' });

  const meus = (await repositorio.listarAtivosComMeta()).filter((linha) => linha.nomeCompleto.startsWith(marca));
  assert.deepEqual(meus.map((linha) => [linha.id, linha.horasDiariasNecessarias]), [[a.id, 8], [b.id, 6]]);
});
