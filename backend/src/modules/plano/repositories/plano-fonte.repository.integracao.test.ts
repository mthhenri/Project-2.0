import * as assert from 'node:assert/strict';
import { TipoPlanoFonteOrigemEnum as Origem } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarGestor } from '../../../testes/fabricas';
import { PlanoFonteRepository } from './plano-fonte.repository';
import { PlanoRepository } from './plano.repository';

// Repository das fontes do plano (task 236): SQL contra o PostgreSQL de teste.

async function cenario(conexao: ConexaoTeste) {
  const criador = await criarGestor(conexao);
  const { id } = await criarRepositorio(PlanoRepository, conexao).inserir({ titulo: 'Plano', projetoId: null, usuarioId: criador.id });
  return { planoId: id, usuarioId: criador.id };
}

testarComBanco('inserir grava a fonte e recuperar devolve o conteúdo, a origem, o tamanho e quem trouxe', async (conexao) => {
  const repositorio = criarRepositorio(PlanoFonteRepository, conexao);
  const { planoId, usuarioId } = await cenario(conexao);

  const criada = await repositorio.inserir({ planoId, titulo: 'E-mail', conteudo: 'Olá, equipe', origem: Origem.COLADO, usuarioId });
  const lida = await repositorio.recuperar({ planoId, id: criada.id });

  assert.equal(criada.origem, Origem.COLADO);
  assert.equal(lida?.conteudo, 'Olá, equipe');
  assert.equal(lida?.origem, Origem.COLADO);
  assert.equal(lida?.tamanho, 'Olá, equipe'.length);
  assert.equal(lida?.usuarioId, usuarioId);
  assert.ok(lida?.usuarioNome);
});

testarComBanco('listar devolve em ordem, sem o conteúdo; listarComConteudo traz o conteúdo; contar conta as ativas', async (conexao) => {
  const repositorio = criarRepositorio(PlanoFonteRepository, conexao);
  const { planoId, usuarioId } = await cenario(conexao);
  const primeira = await repositorio.inserir({ planoId, titulo: 'a.txt', conteudo: 'um', origem: Origem.ARQUIVO, usuarioId });
  const segunda = await repositorio.inserir({ planoId, titulo: 'b', conteudo: 'dois', origem: Origem.COLADO, usuarioId });

  const lista = await repositorio.listar({ planoId });
  assert.deepEqual(lista.map((fonte) => fonte.id), [primeira.id, segunda.id]);
  assert.equal('conteudo' in lista[0], false);
  assert.deepEqual((await repositorio.listarComConteudo({ planoId })).map((fonte) => fonte.conteudo), ['um', 'dois']);
  assert.equal(await repositorio.contar({ planoId }), 2);
});

testarComBanco('excluir é soft delete: some da lista, do contexto e da contagem; a linha continua no banco', async (conexao) => {
  const repositorio = criarRepositorio(PlanoFonteRepository, conexao);
  const { planoId, usuarioId } = await cenario(conexao);
  const { id } = await repositorio.inserir({ planoId, titulo: 'x', conteudo: 'y', origem: Origem.COLADO, usuarioId });

  assert.deepEqual(await repositorio.excluir({ planoId, id }), { id });

  assert.equal(await repositorio.recuperar({ planoId, id }), null);
  assert.deepEqual(await repositorio.listar({ planoId }), []);
  assert.equal(await repositorio.contar({ planoId }), 0);
  assert.equal(await repositorio.excluir({ planoId, id }), null);
  const { rows } = await conexao.raw('SELECT is_deleted FROM plano_fonte WHERE id = ?', [id]);
  assert.equal(rows[0].is_deleted, true);
});

testarComBanco('a fonte de outro plano não é achada nem removida', async (conexao) => {
  const repositorio = criarRepositorio(PlanoFonteRepository, conexao);
  const { planoId, usuarioId } = await cenario(conexao);
  const outro = await cenario(conexao);
  const { id } = await repositorio.inserir({ planoId, titulo: 'x', conteudo: 'y', origem: Origem.COLADO, usuarioId });

  assert.equal(await repositorio.recuperar({ planoId: outro.planoId, id }), null);
  assert.equal(await repositorio.excluir({ planoId: outro.planoId, id }), null);
  assert.equal(await repositorio.contar({ planoId }), 1);
});
