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
  const grupo = await grupos.inserir({ titulo: 'T', rotulo: 'Teste F', ordem: (await grupos.obterMaiorOrdem()) + 1, corIndice: 0 });

  const primeira = await repositorio.gravar({ nomeTabela: 'tabela_de_teste', grupoId: grupo.id, x: 10, y: 20 });
  assert.deepEqual(primeira, { nomeTabela: 'tabela_de_teste', grupoId: grupo.id, x: 10, y: 20 });
  const segunda = await repositorio.gravar({ nomeTabela: 'tabela_de_teste', grupoId: null, x: -5, y: 7 });
  assert.deepEqual(segunda, { nomeTabela: 'tabela_de_teste', grupoId: null, x: -5, y: 7 });

  const doTeste = (await repositorio.listar()).filter((colocacao) => colocacao.nomeTabela === 'tabela_de_teste');
  assert.equal(doTeste.length, 1);
  assert.equal(doTeste[0].grupoId, null);
});

testarComBanco('o banco recusa grupo que não existe', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemTabelaRepository, conexao);
  await assert.rejects(repositorio.gravar({ nomeTabela: 'tabela_de_teste_2', grupoId: 999999, x: 0, y: 0 }));
});
