import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../testes/banco-teste';
import { criarTag } from '../../testes/fabricas';
import { BaseRepository } from './base.repository';

/** Repository mínimo sobre `tag` que expõe os métodos protegidos da base. */
class RepositorioDeTag extends BaseRepository<{ id: number; nome: string }> {
  constructor(conexao: any) {
    super(conexao, 'tag');
  }
  consultar<T>(...argumentos: Parameters<BaseRepository<unknown>['executarConsulta']>) {
    return this.executarConsulta<T>(...argumentos);
  }
  comandar(...argumentos: Parameters<BaseRepository<unknown>['executarComando']>) {
    return this.executarComando(...argumentos);
  }
  excluirLogicamente(id: number) {
    return this.executarSoftDelete(id);
  }
  paginar(pagina: number, itensPorPagina: number) {
    return this.construirPaginacao(pagina, itensPorPagina);
  }
  ordenar(campo: string, direcao?: 'ASC' | 'DESC') {
    return this.construirOrdenacao(campo, direcao);
  }
}

testarComBanco('executarConsulta usa parâmetros nomeados e devolve as linhas tipadas', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  const tag = await criarTag(conexao, { nome: 'Consulta nomeada' });
  const linhas = await repositorio.consultar<{ id: number; nome: string }>(
    'SELECT tag.id, tag.nome FROM tag WHERE tag.id = :id AND tag.is_deleted = false', { id: tag.id });
  assert.deepEqual(linhas, [{ id: tag.id, nome: 'Consulta nomeada' }]);
});

testarComBanco('executarConsulta sem linhas devolve lista vazia', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  const linhas = await repositorio.consultar('SELECT 1 FROM tag WHERE tag.id = :id', { id: -1 });
  assert.deepEqual(linhas, []);
});

testarComBanco('executarComando grava e não devolve dados', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  const tag = await criarTag(conexao, { nome: 'Antes' });
  const retorno = await repositorio.comandar('UPDATE tag SET nome = :nome WHERE tag.id = :id', { nome: 'Depois', id: tag.id });
  assert.equal(retorno, undefined);
  const { rows } = await conexao.raw('SELECT nome FROM tag WHERE tag.id = :id', { id: tag.id });
  assert.equal(rows[0].nome, 'Depois');
});

testarComBanco('executarSoftDelete marca is_deleted, deleted_date e updated_date sem apagar a linha', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  const tag = await criarTag(conexao);
  await repositorio.excluirLogicamente(tag.id);

  const { rows } = await conexao.raw(
    'SELECT is_deleted, deleted_date, updated_date, created_date FROM tag WHERE tag.id = :id', { id: tag.id });
  assert.equal(rows.length, 1, 'a linha continua existindo');
  assert.equal(rows[0].is_deleted, true);
  assert.ok(rows[0].deleted_date instanceof Date);
  assert.ok(rows[0].updated_date.getTime() > rows[0].created_date.getTime(), 'updated_date avança');
});

testarComBanco('aceita transação opcional: o que roda nela some com o rollback dela', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  const tag = await criarTag(conexao, { nome: 'Dentro da transação' });
  await conexao.transaction(async (transacao) => {
    await repositorio.comandar('UPDATE tag SET nome = :nome WHERE tag.id = :id', { nome: 'Alterada', id: tag.id }, transacao);
    const dentro = await repositorio.consultar<{ nome: string }>('SELECT nome FROM tag WHERE tag.id = :id', { id: tag.id }, transacao);
    assert.equal(dentro[0].nome, 'Alterada');
    throw new Error('desfaz a transação');
  }).catch((erro: Error) => assert.equal(erro.message, 'desfaz a transação'));
  const { rows } = await conexao.raw('SELECT nome FROM tag WHERE tag.id = :id', { id: tag.id });
  assert.equal(rows[0].nome, 'Dentro da transação');
});

testarComBanco('construirPaginacao calcula o deslocamento da página 1 e da página N', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  assert.equal(repositorio.paginar(1, 20), 'LIMIT 20 OFFSET 0');
  assert.equal(repositorio.paginar(3, 20), 'LIMIT 20 OFFSET 40');
});

testarComBanco('construirOrdenacao usa ASC por padrão', async (conexao) => {
  const repositorio = new RepositorioDeTag(conexao);
  assert.equal(repositorio.ordenar('tag.nome'), 'ORDER BY tag.nome ASC');
  assert.equal(repositorio.ordenar('tag.nome', 'DESC'), 'ORDER BY tag.nome DESC');
});
