import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { ModelagemGrupoRepository } from './modelagem-grupo.repository';
import { ModelagemTabelaRepository } from './modelagem-tabela.repository';

testarComBanco('listar traz as posições semeadas pela migration, ordenadas pelo nome da tabela', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemTabelaRepository, conexao);
  const lista = await repositorio.listar();
  const nomes = lista.map((colocacao) => colocacao.nomeTabela);
  assert.deepEqual(nomes, [...nomes].sort());
  const usuario = lista.find((colocacao) => colocacao.nomeTabela === 'usuario');
  assert.ok(usuario && usuario.grupoId !== null);
  assert.equal(typeof usuario.x, 'number');
});

testarComBanco('gravar cria a linha na primeira vez e altera a mesma nas seguintes', async (conexao) => {
  const grupos = criarRepositorio(ModelagemGrupoRepository, conexao);
  const repositorio = criarRepositorio(ModelagemTabelaRepository, conexao);
  const primeiroGrupo = await grupos.inserir({ titulo: 'T', rotulo: 'Teste F', ordem: (await grupos.obterMaiorOrdem()) + 1, corIndice: 0 });
  const segundoGrupo = await grupos.inserir({ titulo: 'T2', rotulo: 'Teste G', ordem: (await grupos.obterMaiorOrdem()) + 1, corIndice: 1 });

  const primeira = await repositorio.gravar({ nomeTabela: 'tabela_de_teste', grupoId: primeiroGrupo.id, x: 10, y: 20 });
  assert.deepEqual(primeira, { nomeTabela: 'tabela_de_teste', grupoId: primeiroGrupo.id, x: 10, y: 20 });
  const segunda = await repositorio.gravar({ nomeTabela: 'tabela_de_teste', grupoId: segundoGrupo.id, x: -5, y: 7 });
  assert.deepEqual(segunda, { nomeTabela: 'tabela_de_teste', grupoId: segundoGrupo.id, x: -5, y: 7 });

  const doTeste = (await repositorio.listar()).filter((colocacao) => colocacao.nomeTabela === 'tabela_de_teste');
  assert.equal(doTeste.length, 1);
  assert.equal(doTeste[0].grupoId, segundoGrupo.id);
});

testarComBanco('remover tira a tabela da modelagem por soft delete e ela pode voltar com uma linha nova', async (conexao) => {
  const grupos = criarRepositorio(ModelagemGrupoRepository, conexao);
  const repositorio = criarRepositorio(ModelagemTabelaRepository, conexao);
  const grupo = await grupos.inserir({ titulo: 'T', rotulo: 'Teste H', ordem: (await grupos.obterMaiorOrdem()) + 1, corIndice: 0 });
  await repositorio.gravar({ nomeTabela: 'tabela_de_teste', grupoId: grupo.id, x: 1, y: 2 });

  await repositorio.remover({ nomeTabela: 'tabela_de_teste' });
  assert.ok(!(await repositorio.listar()).some((colocacao) => colocacao.nomeTabela === 'tabela_de_teste'));
  const [linha] = (await conexao.raw("SELECT is_deleted, deleted_date FROM modelagem_tabela WHERE nome_tabela = 'tabela_de_teste'")).rows;
  assert.equal(linha.is_deleted, true);
  assert.ok(linha.deleted_date);

  // Voltar para a modelagem cria uma linha ativa nova (o índice único só vale entre as ativas).
  await repositorio.gravar({ nomeTabela: 'tabela_de_teste', grupoId: grupo.id, x: 9, y: 9 });
  assert.equal((await repositorio.listar()).filter((colocacao) => colocacao.nomeTabela === 'tabela_de_teste').length, 1);
});

testarComBanco('remover uma tabela que não está na modelagem não faz nada e não dá erro', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemTabelaRepository, conexao);
  await repositorio.remover({ nomeTabela: 'tabela_que_nunca_esteve' });
  assert.ok(true);
});

testarComBanco('o banco recusa grupo que não existe', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemTabelaRepository, conexao);
  await assert.rejects(repositorio.gravar({ nomeTabela: 'tabela_de_teste_2', grupoId: 999999, x: 0, y: 0 }));
});

testarComBanco('toda tabela da modelagem tem grupo: o banco recusa grupo nulo', async (conexao) => {
  await assert.rejects(
    conexao.raw("INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted) SELECT 'tabela_de_teste_3', NULL, 0, 0, NOW(), NOW(), false"),
  );
});
