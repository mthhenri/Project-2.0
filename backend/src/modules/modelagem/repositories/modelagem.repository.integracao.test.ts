import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { ModelagemRepository } from './modelagem.repository';

// O catálogo do banco de teste é o das migrations: tabelas conhecidas desde as primeiras migrations servem de referência.

testarComBanco('listarColunas traz as colunas do schema public, sem as tabelas de outros schemas', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemRepository, conexao);
  const colunas = await repositorio.listarColunas();
  const doProjeto = colunas.filter((coluna) => coluna.tabela === 'projeto').map((coluna) => coluna.coluna);
  assert.ok(doProjeto.includes('id') && doProjeto.includes('nome'));
  assert.ok(!colunas.some((coluna) => coluna.tabela === 'pg_class' || coluna.tabela === 'columns'));
  const id = colunas.find((coluna) => coluna.tabela === 'projeto' && coluna.coluna === 'id')!;
  assert.equal(id.anulavel, false);
  assert.ok(id.padrao?.startsWith('nextval('));
});

testarComBanco('listarChavesPrimarias devolve o id de cada tabela', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemRepository, conexao);
  const chaves = await repositorio.listarChavesPrimarias();
  assert.ok(chaves.some((chave) => chave.tabela === 'demanda' && chave.coluna === 'id'));
  assert.ok(chaves.every((chave) => chave.coluna.length > 0));
});

testarComBanco('listarChavesEstrangeiras devolve origem e destino de cada FK', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemRepository, conexao);
  const chaves = await repositorio.listarChavesEstrangeiras();
  const demandaParaProjeto = chaves.find((chave) => chave.tabela === 'demanda' && chave.coluna === 'projeto_id');
  assert.equal(demandaParaProjeto?.tabelaDestino, 'projeto');
  assert.equal(demandaParaProjeto?.colunaDestino, 'id');
  assert.ok(chaves.some((chave) => chave.tabela === 'demanda' && chave.coluna === 'demanda_pai_id' && chave.tabelaDestino === 'demanda'));
});

testarComBanco('obterUltimaMigration devolve o nome da migration mais recente aplicada', async (conexao) => {
  const repositorio = criarRepositorio(ModelagemRepository, conexao);
  const nome = await repositorio.obterUltimaMigration();
  assert.match(nome ?? '', /^\d{4} - /);
});
