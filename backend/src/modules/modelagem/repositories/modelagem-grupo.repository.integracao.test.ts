import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { ModelagemGrupoRepository } from './modelagem-grupo.repository';

// Os grupos que a migration semeia (Domínio, Usuários e ponto...) existem no banco de teste; os testes usam rótulos próprios.

testarComBanco('inserir grava o grupo ativo e listar o devolve na ordem', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemGrupoRepository, conexao);
  const maior = await repositorio.obterMaiorOrdem();
  const criado = await repositorio.inserir({ titulo: 'Grupo de teste', rotulo: 'Teste A', ordem: maior + 1, corIndice: 3 });
  assert.equal(criado.rotulo, 'Teste A');
  assert.equal(criado.corIndice, 3);
  const lista = await repositorio.listar();
  assert.equal(lista[lista.length - 1].id, criado.id);
  assert.ok(lista.length >= 6);
});

testarComBanco('alterar muda o título e o rótulo; excluir faz soft delete e some da lista', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemGrupoRepository, conexao);
  const criado = await repositorio.inserir({ titulo: 'Antes', rotulo: 'Teste B', ordem: (await repositorio.obterMaiorOrdem()) + 1, corIndice: 0 });
  const alterado = await repositorio.alterar({ id: criado.id, titulo: 'Depois', rotulo: 'Teste B2' });
  assert.equal(alterado?.titulo, 'Depois');
  await repositorio.excluir({ id: criado.id });
  assert.equal(await repositorio.recuperar({ id: criado.id }), null);
  assert.ok(!(await repositorio.listar()).some((grupo) => grupo.id === criado.id));
  const [linha] = (await conexao.raw('SELECT is_deleted, deleted_date FROM modelagem_grupo WHERE id = :id', { id: criado.id })).rows;
  assert.equal(linha.is_deleted, true);
  assert.ok(linha.deleted_date);
});

testarComBanco('validarRotulo ignora maiúsculas, ignora o próprio grupo e libera o rótulo de um grupo excluído', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemGrupoRepository, conexao);
  const criado = await repositorio.inserir({ titulo: 'T', rotulo: 'Teste C', ordem: (await repositorio.obterMaiorOrdem()) + 1, corIndice: 0 });
  assert.equal(await repositorio.validarRotulo({ rotulo: 'TESTE c' }), true);
  assert.equal(await repositorio.validarRotulo({ rotulo: 'teste c', idExcluir: criado.id }), false);
  await repositorio.excluir({ id: criado.id });
  assert.equal(await repositorio.validarRotulo({ rotulo: 'Teste C' }), false);
});

// Cada recusa do banco fica sozinha no fim do teste: depois de um erro a transação do teste não aceita mais comandos.
testarComBanco('o banco recusa cor fora da paleta', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemGrupoRepository, conexao);
  await assert.rejects(repositorio.inserir({ titulo: 'T', rotulo: 'Teste D', ordem: 99, corIndice: 7 }));
});

testarComBanco('o banco recusa rótulo repetido entre grupos ativos, sem diferenciar maiúsculas', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemGrupoRepository, conexao);
  await repositorio.inserir({ titulo: 'T', rotulo: 'Teste E', ordem: 99, corIndice: 1 });
  await assert.rejects(repositorio.inserir({ titulo: 'T2', rotulo: 'TESTE e', ordem: 100, corIndice: 2 }));
});
