import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import {
  criarDemanda,
  criarDemandaUsuario,
  criarDesenvolvedor,
  criarGestor,
  criarProjeto,
  excluirLinha,
} from '../../../testes/fabricas';
import { PlanoRepository } from './plano.repository';

// Repository do plano (task 232): SQL de acesso, versão, ligação com a demanda e ciclo de vida.

testarComBanco('inserir grava o plano na versão 1, sem textos, compartilhado e fora do arquivo', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);

  const { id } = await repositorio.inserir({ titulo: 'Meu plano', projetoId: projeto.id, usuarioId: criador.id });
  const plano = await repositorio.recuperar({ id });

  assert.equal(plano?.titulo, 'Meu plano');
  assert.equal(plano?.projetoId, projeto.id);
  assert.equal(plano?.projetoNome, projeto.nome);
  assert.equal(plano?.criadorId, criador.id);
  assert.equal(plano?.versao, 1);
  assert.equal(plano?.isSolo, false);
  assert.equal(plano?.isArquivado, false);
  assert.equal(plano?.descricaoTecnica, null);
  assert.equal(plano?.demandaId, null);
});

testarComBanco('alterar só grava com a versão lida e sobe a versão; versão antiga devolve null sem gravar', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarDesenvolvedor(conexao);
  const { id } = await repositorio.inserir({ titulo: 'Original', projetoId: null, usuarioId: criador.id });

  const primeira = await repositorio.alterar({ id, versao: 1, descricaoTecnica: 'Texto A', titulo: 'Novo' });
  assert.equal(primeira?.versao, 2);
  assert.equal(primeira?.titulo, 'Novo');

  const sobreVersaoAntiga = await repositorio.alterar({ id, versao: 1, descricaoTecnica: 'Texto B' });
  assert.equal(sobreVersaoAntiga, null);
  assert.equal((await repositorio.recuperar({ id }))?.descricaoTecnica, 'Texto A');

  await repositorio.alterar({ id, versao: 2, documentacao: 'Doc' });
  const lido = await repositorio.recuperar({ id });
  assert.equal(lido?.descricaoTecnica, 'Texto A', 'campo ausente não é tocado');
  assert.equal(lido?.documentacao, 'Doc');
  assert.equal(lido?.versao, 3);

  await repositorio.alterar({ id, versao: 3, descricaoTecnica: null });
  assert.equal((await repositorio.recuperar({ id }))?.descricaoTecnica, null, 'null limpa o texto');
});

testarComBanco('listar: plano amplo e plano solo só do criador; plano de projeto de quem tem acesso', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarDesenvolvedor(conexao);
  const colega = await criarDesenvolvedor(conexao);
  const forasteiro = await criarDesenvolvedor(conexao);
  const gestor = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: criador.id });
  await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: colega.id });

  const { id: planoCompartilhado } = await repositorio.inserir({ titulo: 'Compartilhado', projetoId: projeto.id, usuarioId: criador.id });
  const { id: planoSolo } = await repositorio.inserir({ titulo: 'Solo', projetoId: projeto.id, usuarioId: criador.id });
  await repositorio.marcarSolo({ id: planoSolo, isSolo: true });
  const { id: planoAmplo } = await repositorio.inserir({ titulo: 'Amplo', projetoId: null, usuarioId: criador.id });

  const ids = async (usuarioId: number, ehGestor: boolean) =>
    (await repositorio.listar({ usuarioId, ehGestor })).map((plano) => plano.id).sort((a, b) => a - b);

  assert.deepEqual(await ids(criador.id, false), [planoCompartilhado, planoSolo, planoAmplo]);
  assert.deepEqual(await ids(colega.id, false), [planoCompartilhado], 'colega com acesso não vê solo nem amplo');
  assert.deepEqual(await ids(forasteiro.id, false), [], 'sem demanda no projeto, não vê nada');
  assert.deepEqual(await ids(gestor.id, true), [planoCompartilhado], 'gestor vê o de projeto e nunca o solo nem o amplo de outra pessoa');
});

testarComBanco('listar: arquivado some do seletor, volta com incluirArquivados ou com busca; busca por título e filtro por projeto', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const { id: ativo } = await repositorio.inserir({ titulo: 'Relatório mensal', projetoId: projeto.id, usuarioId: criador.id });
  const { id: arquivado } = await repositorio.inserir({ titulo: 'Relatório antigo', projetoId: null, usuarioId: criador.id });
  await repositorio.arquivar({ id: arquivado, isArquivado: true });
  const base = { usuarioId: criador.id, ehGestor: true };

  assert.deepEqual((await repositorio.listar(base)).map((plano) => plano.id), [ativo]);
  assert.equal((await repositorio.listar({ ...base, incluirArquivados: true })).length, 2);
  assert.equal((await repositorio.listar({ ...base, busca: 'antigo' })).length, 1, 'a busca encontra o arquivado');
  assert.equal((await repositorio.listar({ ...base, busca: 'RELATÓRIO' })).length, 2, 'busca sem diferenciar maiúscula');
  assert.equal((await repositorio.listar({ ...base, busca: '100%' })).length, 0, 'curinga do LIKE é literal');
  assert.deepEqual((await repositorio.listar({ ...base, projetoId: projeto.id })).map((plano) => plano.id), [ativo]);
});

testarComBanco('ligarDemanda troca a ligação (uma por plano) e a demanda excluída deixa o plano sem demanda', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const primeira = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Primeira' });
  const segunda = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Segunda' });
  const { id } = await repositorio.inserir({ titulo: 'Com demanda', projetoId: projeto.id, usuarioId: criador.id });

  await repositorio.ligarDemanda({ planoId: id, demandaId: primeira.id });
  assert.equal((await repositorio.recuperar({ id }))?.demandaNome, 'Primeira');

  await repositorio.ligarDemanda({ planoId: id, demandaId: segunda.id });
  assert.equal((await repositorio.recuperar({ id }))?.demandaId, segunda.id);
  const { rows } = await conexao.raw(
    'SELECT COUNT(*)::int AS total FROM plano_demanda WHERE plano_id = :id AND is_deleted = false', { id });
  assert.equal(rows[0].total, 1);

  await excluirLinha(conexao, 'demanda', segunda.id);
  const semDemanda = await repositorio.recuperar({ id });
  assert.equal(semDemanda?.demandaId, null);
  assert.equal(semDemanda?.demandaNome, null);
});

testarComBanco('projeto excluído leva os planos dele', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const { id } = await repositorio.inserir({ titulo: 'Do projeto', projetoId: projeto.id, usuarioId: criador.id });

  await excluirLinha(conexao, 'projeto', projeto.id);

  assert.equal(await repositorio.recuperar({ id }), null);
  assert.deepEqual(await repositorio.listar({ usuarioId: criador.id, ehGestor: true }), []);
});

testarComBanco('atribuirProjeto só age sobre plano amplo', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const outroProjeto = await criarProjeto(conexao);
  const { id } = await repositorio.inserir({ titulo: 'Amplo', projetoId: null, usuarioId: criador.id });

  assert.equal(await repositorio.atribuirProjeto({ id, projetoId: projeto.id }), true);
  assert.equal((await repositorio.recuperar({ id }))?.projetoId, projeto.id);
  assert.equal(await repositorio.atribuirProjeto({ id, projetoId: outroProjeto.id }), false, 'não troca de projeto');
});

testarComBanco('excluir faz soft delete do plano e da ligação com a demanda', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const { id } = await repositorio.inserir({ titulo: 'A excluir', projetoId: projeto.id, usuarioId: criador.id });
  await repositorio.ligarDemanda({ planoId: id, demandaId: demanda.id });

  await repositorio.excluir({ id });

  assert.equal(await repositorio.recuperar({ id }), null);
  const plano = await conexao.raw('SELECT is_deleted, deleted_date FROM plano WHERE id = :id', { id });
  assert.equal(plano.rows[0].is_deleted, true);
  assert.ok(plano.rows[0].deleted_date instanceof Date);
  const ligacao = await conexao.raw('SELECT is_deleted FROM plano_demanda WHERE plano_id = :id', { id });
  assert.equal(ligacao.rows.length, 1);
  assert.equal(ligacao.rows[0].is_deleted, true);
});

testarComBanco('marcarPublicacao grava o instante na ligação ativa; sem ligação devolve null; ligar de novo zera a data', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const { id } = await repositorio.inserir({ titulo: 'Publicado', projetoId: projeto.id, usuarioId: criador.id });

  assert.equal(await repositorio.marcarPublicacao({ planoId: id }), null, 'sem demanda ligada não há o que marcar');

  await repositorio.ligarDemanda({ planoId: id, demandaId: demanda.id });
  assert.equal((await repositorio.recuperar({ id }))?.publicacaoData, null);

  const instante = await repositorio.marcarPublicacao({ planoId: id });
  assert.ok(instante);
  assert.ok((await repositorio.recuperar({ id }))?.publicacaoData, 'o plano passa a mostrar a data da publicação');
});

testarComBanco('listarPorDemanda: os planos ativos ligados à demanda, o mexido por último primeiro; exclui plano excluído e ligação desfeita', async (conexao) => {
  const repositorio = criarRepositorio(PlanoRepository, conexao);
  const criador = await criarGestor(conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const outraDemanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const { id: antigo } = await repositorio.inserir({ titulo: 'Antigo', projetoId: projeto.id, usuarioId: criador.id });
  const { id: recente } = await repositorio.inserir({ titulo: 'Recente', projetoId: projeto.id, usuarioId: criador.id });
  const { id: excluido } = await repositorio.inserir({ titulo: 'Excluído', projetoId: projeto.id, usuarioId: criador.id });
  const { id: religado } = await repositorio.inserir({ titulo: 'Religado', projetoId: projeto.id, usuarioId: criador.id });
  for (const planoId of [antigo, recente, excluido, religado]) await repositorio.ligarDemanda({ planoId, demandaId: demanda.id });
  await repositorio.ligarDemanda({ planoId: religado, demandaId: outraDemanda.id });
  await repositorio.excluir({ id: excluido });
  await repositorio.alterar({ id: recente, versao: 1, titulo: 'Recente' });

  const planos = await repositorio.listarPorDemanda({ demandaId: demanda.id });
  assert.deepEqual(planos.map((plano) => plano.titulo), ['Recente', 'Antigo']);
  assert.equal(planos[0].demandaId, demanda.id);
});
