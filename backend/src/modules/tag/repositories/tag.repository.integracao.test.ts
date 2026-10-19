import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarTag } from '../../../testes/fabricas';
import { TagRepository } from './tag.repository';

// Repository de referência dos testes de integração (task 171): cobre o ciclo inteiro da tag.

testarComBanco('inserir grava a tag ativa e devolve os dados', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  const criada = await repositorio.inserir({ nome: 'Backend', cor: '#112233' });
  assert.equal(criada.nome, 'Backend');
  assert.equal(criada.cor, '#112233');
  const recuperada = await repositorio.recuperar({ id: criada.id });
  assert.equal(recuperada?.nome, 'Backend');
});

testarComBanco('listar devolve só as ativas, ordenadas por nome', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  await criarTag(conexao, { nome: 'Zz tag' });
  await criarTag(conexao, { nome: 'Aa tag' });
  const excluida = await criarTag(conexao, { nome: 'Mm tag' });
  await repositorio.excluir({ id: excluida.id });

  const nomes = (await repositorio.listar()).map((tag) => tag.nome).filter((nome) => nome.endsWith(' tag'));
  assert.deepEqual(nomes, ['Aa tag', 'Zz tag']);
});

testarComBanco('excluir faz soft delete: grava is_deleted e deleted_date, sem remover a linha', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  const tag = await criarTag(conexao);
  await repositorio.excluir({ id: tag.id });

  assert.equal(await repositorio.recuperar({ id: tag.id }), null);
  const { rows } = await conexao.raw(
    'SELECT is_deleted, deleted_date FROM tag WHERE tag.id = :id', { id: tag.id });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].is_deleted, true);
  assert.ok(rows[0].deleted_date instanceof Date);
});

testarComBanco('alterar muda só os campos informados', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  const tag = await criarTag(conexao, { nome: 'Original', cor: '#000000' });
  const alterada = await repositorio.alterar({ id: tag.id, cor: '#ffffff' });
  assert.equal(alterada.nome, 'Original');
  assert.equal(alterada.cor, '#ffffff');
});

testarComBanco('alterar não toca tag excluída', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  const tag = await criarTag(conexao);
  await repositorio.excluir({ id: tag.id });
  const alterada = await repositorio.alterar({ id: tag.id, nome: 'Nova' });
  assert.equal(alterada, undefined);
});

testarComBanco('validarNome: existe entre ativas, ignora excluídas e respeita idExcluir', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  const tag = await criarTag(conexao, { nome: 'Nome único' });

  assert.equal(await repositorio.validarNome({ nome: 'Nome único' }), true);
  assert.equal(await repositorio.validarNome({ nome: 'Nome único', idExcluir: tag.id }), false);
  assert.equal(await repositorio.validarNome({ nome: 'Outro nome' }), false);

  await repositorio.excluir({ id: tag.id });
  assert.equal(await repositorio.validarNome({ nome: 'Nome único' }), false);
});

testarComBanco('recuperarExcluida e restaurar desfazem o soft delete', async (conexao) => {
  const repositorio = criarRepositorio(TagRepository, conexao);
  const tag = await criarTag(conexao, { nome: 'Para restaurar' });

  assert.equal(await repositorio.recuperarExcluida({ id: tag.id }), null, 'tag ativa não conta como excluída');
  await repositorio.excluir({ id: tag.id });
  assert.equal((await repositorio.recuperarExcluida({ id: tag.id }))?.nome, 'Para restaurar');

  const restaurada = await repositorio.restaurar({ id: tag.id });
  assert.equal(restaurada.nome, 'Para restaurar');
  assert.equal((await repositorio.recuperar({ id: tag.id }))?.nome, 'Para restaurar');
  const { rows } = await conexao.raw('SELECT deleted_date FROM tag WHERE tag.id = :id', { id: tag.id });
  assert.equal(rows[0].deleted_date, null);
});
