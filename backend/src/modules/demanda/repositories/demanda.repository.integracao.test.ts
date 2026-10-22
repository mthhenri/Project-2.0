import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum } from '@project20/shared';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import {
  criarAtividade, criarDemanda, criarDemandaConexao, criarDemandaTag, criarDemandaUsuario, criarDesenvolvedor, criarExecucao,
  criarGestor, criarProjeto, criarTag, excluirLinha,
} from '../../../testes/fabricas';
import { DemandaRepository } from './demanda.repository';

// CTEs recursivas, acesso por demanda_usuario e soft delete da demanda (SYSTEM.SPEC.md §13, §14 e SCHEMA.md).

const ids = (itens: Array<{ id: number }>) => itens.map((item) => item.id);

/** Árvore: raiz → (a, b); a → (a1). Todas estruturais para poderem ter filhas. */
async function montarArvore(conexao: Parameters<typeof criarProjeto>[0]) {
  const projeto = await criarProjeto(conexao);
  const raiz = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Raiz', isEstrutural: true });
  const a = await criarDemanda(conexao, { projetoId: projeto.id, demandaPaiId: raiz.id, nome: 'A', isEstrutural: true });
  const b = await criarDemanda(conexao, { projetoId: projeto.id, demandaPaiId: raiz.id, nome: 'B' });
  const a1 = await criarDemanda(conexao, { projetoId: projeto.id, demandaPaiId: a.id, nome: 'A1' });
  return { projeto, raiz, a, b, a1 };
}

// ---------------------------------------------------------------------------
// Ciclo no grafo de conexões
// ---------------------------------------------------------------------------

async function tresDemandas(conexao: Parameters<typeof criarProjeto>[0], quantidade = 3) {
  const projeto = await criarProjeto(conexao);
  const demandas = [];
  for (let indice = 0; indice < quantidade; indice++) demandas.push(await criarDemanda(conexao, { projetoId: projeto.id }));
  return demandas;
}

testarComBanco('ciclo: conexão direta inversa (A→B existe, B→A criaria ciclo)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b] = await tresDemandas(conexao, 2);
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: b.id, demandaDestinoId: a.id }), true);
});

testarComBanco('ciclo: indireto com três ou mais nós (A→B→C→D, D→A criaria ciclo)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b, c, d] = await tresDemandas(conexao, 4);
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  await criarDemandaConexao(conexao, { demandaOrigemId: b.id, demandaDestinoId: c.id });
  await criarDemandaConexao(conexao, { demandaOrigemId: c.id, demandaDestinoId: d.id });
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: d.id, demandaDestinoId: a.id }), true);
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: c.id, demandaDestinoId: a.id }), true);
});

testarComBanco('ciclo: a CTE não trata A→A (quem recusa é a service, e o banco tem a constraint abaixo)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b] = await tresDemandas(conexao, 2);
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  // A→A: o destino A alcança B, que não é A, então a CTE sozinha não vê ciclo — por isso a service confere origem = destino antes.
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: a.id, demandaDestinoId: a.id }), false);
});

testarComBanco('ciclo: o banco recusa a auto-conexão (chk_demanda_conexao_sem_autorreferencia)', async (conexao) => {
  const [a] = await tresDemandas(conexao, 1);
  await assert.rejects(
    () => conexao.transaction((transacao) => criarDemandaConexao(transacao, { demandaOrigemId: a.id, demandaDestinoId: a.id })),
    /chk_demanda_conexao_sem_autorreferencia|check constraint/i,
  );
});

testarComBanco('ciclo: conexão válida em diamante (A→B, A→C, B→D, C→D) não é ciclo', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b, c, d] = await tresDemandas(conexao, 4);
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: c.id });
  await criarDemandaConexao(conexao, { demandaOrigemId: b.id, demandaDestinoId: d.id });
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: c.id, demandaDestinoId: d.id }), false);
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: a.id, demandaDestinoId: d.id }), false);
});

testarComBanco('ciclo: conexão excluída não conta para o ciclo', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b] = await tresDemandas(conexao, 2);
  const existente = await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  await repositorio.excluirConexao({ demandaId: a.id, conexaoId: existente.id });
  assert.equal(await repositorio.verificarCriariaCiclo({ demandaOrigemId: b.id, demandaDestinoId: a.id }), false);
});

testarComBanco('conexões: validarConexao vale por sentido; validarConexaoDemanda aceita a origem e, se bidirecional, o destino', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b, c] = await tresDemandas(conexao, 3);
  const simples = await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  const bidirecional = await criarDemandaConexao(conexao, { demandaOrigemId: b.id, demandaDestinoId: c.id, ehBidirecional: true });

  assert.equal(await repositorio.validarConexao({ demandaOrigemId: a.id, demandaDestinoId: b.id }), true);
  assert.equal(await repositorio.validarConexao({ demandaOrigemId: b.id, demandaDestinoId: a.id }), false, 'o sentido inverso não existe');

  assert.equal(await repositorio.validarConexaoDemanda({ conexaoId: simples.id, demandaId: a.id }), true);
  assert.equal(await repositorio.validarConexaoDemanda({ conexaoId: simples.id, demandaId: b.id }), false, 'unidirecional: o destino não é dono');
  assert.equal(await repositorio.validarConexaoDemanda({ conexaoId: bidirecional.id, demandaId: c.id }), true, 'bidirecional: o destino também');
  assert.equal(await repositorio.validarConexaoDemanda({ conexaoId: simples.id, demandaId: c.id }), false);
});

testarComBanco('listarConexoes: direção saída, entrada (bidirecional) e bidirecional; sem a demanda excluída', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const [a, b, c, d] = await tresDemandas(conexao, 4);
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: b.id });
  await criarDemandaConexao(conexao, { demandaOrigemId: c.id, demandaDestinoId: a.id, ehBidirecional: true });
  await criarDemandaConexao(conexao, { demandaOrigemId: d.id, demandaDestinoId: a.id });
  const comExcluida = await criarDemanda(conexao, { projetoId: a.projetoId });
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: comExcluida.id });
  await excluirLinha(conexao, 'demanda', comExcluida.id);

  const conexoes = await repositorio.listarConexoes({ demandaId: a.id });
  const porDemanda = Object.fromEntries(conexoes.map((item) => [item.demandaConectadaId, item.direcao]));
  assert.deepEqual(porDemanda, { [b.id]: 'saida', [c.id]: 'bidirecional' });
  assert.ok(!(d.id in porDemanda), 'conexão unidirecional que chega em A não aparece em A');
});

// ---------------------------------------------------------------------------
// Árvore, ancestral e exclusão dentro das CTEs
// ---------------------------------------------------------------------------

testarComBanco('listarDescendentes: a própria demanda no nível 0 e as demais com o nível da profundidade', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { raiz, a, b, a1 } = await montarArvore(conexao);
  const itens = await repositorio.listarDescendentes({ demandaId: raiz.id });
  assert.deepEqual(itens.map((item) => [item.id, item.nivel]), [[raiz.id, 0], [a.id, 1], [b.id, 1], [a1.id, 2]]);
  assert.equal((await repositorio.listarDescendentes({ demandaId: a.id })).length, 2);
  assert.equal((await repositorio.listarDescendentes({ demandaId: b.id })).length, 1, 'folha: só ela mesma');
});

testarComBanco('listarDescendentes: demanda excluída sai da árvore junto com tudo que está abaixo dela', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { raiz, a, b } = await montarArvore(conexao);
  await excluirLinha(conexao, 'demanda', a.id);
  assert.deepEqual(ids(await repositorio.listarDescendentes({ demandaId: raiz.id })), [raiz.id, b.id]);
  assert.deepEqual(await repositorio.listarDescendentes({ demandaId: a.id }), [], 'a própria demanda excluída não abre árvore');
});

testarComBanco('listarDescendentes: traz tags ativas, flags de descrição e minutos executados (execução ativa conta até agora)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id, descricaoTecnica: 'texto', descricaoCliente: '', documentacao: null });
  const ativa = await criarTag(conexao, { nome: 'Ativa' });
  const apagada = await criarTag(conexao, { nome: 'Apagada' });
  await criarDemandaTag(conexao, { demandaId: demanda.id, tagId: ativa.id });
  await criarDemandaTag(conexao, { demandaId: demanda.id, tagId: apagada.id });
  await excluirLinha(conexao, 'tag', apagada.id);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T09:00:00-03:00', fimData: '2026-01-15T10:30:00-03:00' });

  const [item] = await repositorio.listarDescendentes({ demandaId: demanda.id });
  assert.deepEqual(item.tags.map((tag) => tag.nome), ['Ativa']);
  assert.deepEqual([item.temDescricaoTecnica, item.temDescricaoCliente, item.temDocumentacao], [true, false, false]);
  assert.equal(item.minutosExecutados, 90);
});

testarComBanco('listarAncestral: do topo até o pai (raiz primeiro), sem a própria demanda', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { raiz, a, a1 } = await montarArvore(conexao);
  const ancestrais = await repositorio.listarAncestral({ demandaId: a1.id });
  assert.deepEqual(ancestrais.map((item) => [item.id, item.nivel]), [[raiz.id, 2], [a.id, 1]]);
  assert.deepEqual(await repositorio.listarAncestral({ demandaId: raiz.id }), []);
});

testarComBanco('listarAncestral: pai excluído corta a cadeia', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { a, a1 } = await montarArvore(conexao);
  await excluirLinha(conexao, 'demanda', a.id);
  assert.deepEqual(await repositorio.listarAncestral({ demandaId: a1.id }), []);
});

testarComBanco('listar: caminho com a árvore de nomes; filhas de pai excluído caem no próprio nome', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { projeto, raiz, a, a1 } = await montarArvore(conexao);
  const { itens } = await repositorio.listar({ projetoId: projeto.id, allRows: true });
  const caminho = Object.fromEntries(itens.map((item) => [item.id, item.caminho]));
  assert.match(caminho[raiz.id], /^Raiz$/);
  assert.match(caminho[a.id], /Raiz.+A$/);
  assert.match(caminho[a1.id], /Raiz.+A.+A1$/);

  await excluirLinha(conexao, 'demanda', a.id);
  const depois = (await repositorio.listar({ projetoId: projeto.id, allRows: true })).itens;
  assert.ok(!ids(depois).includes(a.id));
  assert.equal(depois.find((item) => item.id === a1.id)?.caminho, 'A1');
});

testarComBanco('listar: ordem por nome, filtros (status, estrutural, pai) e paginação com o total da busca inteira', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const projeto = await criarProjeto(conexao);
  const pai = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Pai', isEstrutural: true });
  await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Zeta', statusCodigo: 'CONCLUIDA' });
  await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Alfa', demandaPaiId: pai.id });
  await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Beta' });

  const todas = await repositorio.listar({ projetoId: projeto.id, allRows: true });
  assert.deepEqual(todas.itens.map((item) => item.nome), ['Alfa', 'Beta', 'Pai', 'Zeta']);
  assert.deepEqual((await repositorio.listar({ projetoId: projeto.id, status: TipoDemandaStatusEnum.CONCLUIDA, allRows: true })).itens.map((item) => item.nome), ['Zeta']);
  assert.deepEqual((await repositorio.listar({ projetoId: projeto.id, isEstrutural: true, allRows: true })).itens.map((item) => item.nome), ['Pai']);
  assert.deepEqual((await repositorio.listar({ projetoId: projeto.id, demandaPaiId: pai.id, allRows: true })).itens.map((item) => item.nome), ['Alfa']);
  const pagina = await repositorio.listar({ projetoId: projeto.id, pagina: 2, itensPorPagina: 3 });
  assert.deepEqual([pagina.itens.map((item) => item.nome), pagina.total], [['Zeta'], 4]);
});

// ---------------------------------------------------------------------------
// Acesso do desenvolvedor (demanda_usuario) e gestor sem atribuição
// ---------------------------------------------------------------------------

testarComBanco('recuperar com filtro: o desenvolvedor vê QUALQUER demanda de projeto em que tem ao menos uma, e nenhuma de outro projeto', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  const minha = await criarDemanda(conexao, { projetoId: projeto.id });
  const colega = await criarDemanda(conexao, { projetoId: projeto.id });
  const alheia = await criarDemanda(conexao, {});
  await criarDemandaUsuario(conexao, { demandaId: minha.id, usuarioId: desenvolvedor.id });

  const filtro = { usuarioId: desenvolvedor.id };
  assert.equal((await repositorio.recuperar({ id: minha.id }, filtro))?.id, minha.id);
  assert.equal((await repositorio.recuperar({ id: colega.id }, filtro))?.id, colega.id, 'ver a do colega no mesmo projeto: pode');
  assert.equal(await repositorio.recuperar({ id: alheia.id }, filtro), null, 'projeto sem demanda dele: não');
});

testarComBanco('gestor sem nenhuma linha em demanda_usuario recupera qualquer demanda (sem filtro)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const gestor = await criarGestor(conexao);
  const demanda = await criarDemanda(conexao, {});
  assert.equal((await repositorio.recuperar({ id: demanda.id }))?.id, demanda.id);
  const { rows } = await conexao.raw('SELECT count(*)::int AS total FROM demanda_usuario WHERE usuario_id = :id', { id: gestor.id });
  assert.equal(rows[0].total, 0);
});

testarComBanco('recuperar não devolve demanda excluída', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const demanda = await criarDemanda(conexao, {});
  await repositorio.excluir({ id: demanda.id });
  assert.equal(await repositorio.recuperar({ id: demanda.id }), null);
});

testarComBanco('listar com restrição: o desenvolvedor lista só as demandas em que é membro', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  const minha = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Minha' });
  await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Do colega' });
  await criarDemandaUsuario(conexao, { demandaId: minha.id, usuarioId: desenvolvedor.id });
  const { itens, total } = await repositorio.listar({ projetoId: projeto.id, allRows: true }, { usuarioId: desenvolvedor.id });
  assert.deepEqual([ids(itens), total], [[minha.id], 1]);
});

testarComBanco('validarAcessoProjeto: só com demanda não excluída e atribuição não excluída no projeto', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const atribuicao = await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: desenvolvedor.id });
  const dto = { projetoId: projeto.id, usuarioId: desenvolvedor.id };

  assert.equal(await repositorio.validarAcessoProjeto(dto), true);
  assert.equal(await repositorio.validarAcessoProjeto({ ...dto, usuarioId: (await criarDesenvolvedor(conexao)).id }), false);
  await excluirLinha(conexao, 'demanda_usuario', atribuicao.id);
  assert.equal(await repositorio.validarAcessoProjeto(dto), false);
});

testarComBanco('listarAtribuidas: só PENDENTE e PLANEJADA; o desenvolvedor só as dele, o gestor todas; projeto e demanda excluídos fora', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  const projeto = await criarProjeto(conexao);
  const pendente = await criarDemanda(conexao, { projetoId: projeto.id, statusCodigo: 'PENDENTE' });
  const planejada = await criarDemanda(conexao, { projetoId: projeto.id, statusCodigo: 'PLANEJADA' });
  const concluida = await criarDemanda(conexao, { projetoId: projeto.id, statusCodigo: 'CONCLUIDA' });
  const doColega = await criarDemanda(conexao, { projetoId: projeto.id, statusCodigo: 'PENDENTE' });
  for (const demanda of [pendente, planejada, concluida]) await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: desenvolvedor.id });

  const minhas = await repositorio.listarAtribuidas({ usuarioId: desenvolvedor.id, apenasAtribuidas: true });
  assert.deepEqual(ids(minhas).sort(), [pendente.id, planejada.id].sort());
  assert.equal(minhas[0].nomeProjeto, projeto.nome);

  const todasDoGestor = await repositorio.listarAtribuidas({ usuarioId: 0, apenasAtribuidas: false });
  assert.ok(ids(todasDoGestor).includes(doColega.id));
  assert.ok(!ids(todasDoGestor).includes(concluida.id));

  await excluirLinha(conexao, 'projeto', projeto.id);
  assert.deepEqual(await repositorio.listarAtribuidas({ usuarioId: desenvolvedor.id, apenasAtribuidas: true }), []);
});

// ---------------------------------------------------------------------------
// Criação, atribuição transacional, membros e tags
// ---------------------------------------------------------------------------

const DADOS_INSERIR = {
  nome: 'Criada', descricaoTecnica: null, descricaoCliente: null, documentacao: null, horasEstimadas: 3,
  status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, previsaoFimData: null, demandaPaiId: null,
};

testarComBanco('inserirComAtribuicao grava a demanda e as atribuições; sem usuários (gestor) não grava nenhuma', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const projeto = await criarProjeto(conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);

  const comMembro = await repositorio.inserirComAtribuicao({ ...DADOS_INSERIR, projetoId: projeto.id } as never, { usuarioIds: [desenvolvedor.id] });
  assert.equal(await repositorio.validarMembro({ demandaId: comMembro.id, usuarioId: desenvolvedor.id }), true);
  assert.equal(await repositorio.contarMembrosDemanda({ demandaId: comMembro.id }), 1);

  const semMembro = await repositorio.inserirComAtribuicao({ ...DADOS_INSERIR, projetoId: projeto.id, nome: 'Do gestor' } as never, { usuarioIds: [] });
  assert.equal(await repositorio.contarMembrosDemanda({ demandaId: semMembro.id }), 0);
});

testarComBanco('inserirComAtribuicao é atômico: se uma atribuição falha, a demanda não fica gravada', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const projeto = await criarProjeto(conexao);
  const desenvolvedor = await criarDesenvolvedor(conexao);
  await assert.rejects(
    () => repositorio.inserirComAtribuicao({ ...DADOS_INSERIR, projetoId: projeto.id, nome: 'Atômica' } as never, { usuarioIds: [desenvolvedor.id, desenvolvedor.id] }),
    /uix_demanda_usuario_ativo|duplicate/i,
  );
  const { rows } = await conexao.raw('SELECT count(*)::int AS total FROM demanda WHERE demanda.nome = :nome', { nome: 'Atômica' });
  assert.equal(rows[0].total, 0);
});

testarComBanco('membros: atribuir, listar com tipo e cargo, validar, contar e remover (soft delete); um membro só uma vez', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const demanda = await criarDemanda(conexao, {});
  const ana = await criarDesenvolvedor(conexao, { nomeCompleto: 'Ana' });
  const beto = await criarGestor(conexao, { nomeCompleto: 'Beto' });
  await repositorio.atribuirMembroDemanda({ demandaId: demanda.id, usuarioId: ana.id });
  await repositorio.atribuirMembroDemanda({ demandaId: demanda.id, usuarioId: beto.id });
  await assert.rejects(() => conexao.transaction((transacao) => criarRepositorio(DemandaRepository, transacao).atribuirMembroDemanda({ demandaId: demanda.id, usuarioId: ana.id })), /uix_demanda_usuario_ativo|duplicate/i);

  const membros = await repositorio.listarMembrosDemanda({ demandaId: demanda.id });
  assert.deepEqual(membros.map((membro) => [membro.nomeCompleto, membro.tipo]).sort(), [['Ana', 'DESENVOLVEDOR'], ['Beto', 'GESTOR']]);
  assert.equal(await repositorio.contarMembrosDemanda({ demandaId: demanda.id }), 2);

  await repositorio.removerMembroDemanda({ demandaId: demanda.id, usuarioId: ana.id });
  assert.equal(await repositorio.validarMembro({ demandaId: demanda.id, usuarioId: ana.id }), false);
  assert.equal(await repositorio.contarMembrosDemanda({ demandaId: demanda.id }), 1);
  const { rows } = await conexao.raw('SELECT is_deleted FROM demanda_usuario WHERE demanda_id = :d AND usuario_id = :u', { d: demanda.id, u: ana.id });
  assert.equal(rows[0].is_deleted, true, 'soft delete: a linha continua');
});

testarComBanco('tags: atribuirTagsDemanda sincroniza (remove as que saíram, insere as novas, mantém as que ficam)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const demanda = await criarDemanda(conexao, {});
  const [t1, t2, t3] = [await criarTag(conexao, { nome: 'T1' }), await criarTag(conexao, { nome: 'T2' }), await criarTag(conexao, { nome: 'T3' })];
  await repositorio.atribuirTagsDemanda({ demandaId: demanda.id, tagIds: [t1.id, t2.id] });
  assert.deepEqual((await repositorio.listarTagsDemanda({ demandaId: demanda.id })).map((tag) => tag.nome).sort(), ['T1', 'T2']);

  await repositorio.atribuirTagsDemanda({ demandaId: demanda.id, tagIds: [t2.id, t3.id] });
  assert.deepEqual((await repositorio.listarTagsDemanda({ demandaId: demanda.id })).map((tag) => tag.nome).sort(), ['T2', 'T3']);
  await repositorio.atribuirTagsDemanda({ demandaId: demanda.id, tagIds: [] });
  assert.deepEqual(await repositorio.listarTagsDemanda({ demandaId: demanda.id }), []);
});

// ---------------------------------------------------------------------------
// Alterar, excluir, restaurar, grafo e planejamento
// ---------------------------------------------------------------------------

testarComBanco('alterar muda só o que veio, status por código, e não toca demanda excluída', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const demanda = await criarDemanda(conexao, { nome: 'Antes', horasEstimadas: 2 });
  const alterada = await repositorio.alterar({ id: demanda.id, nome: 'Depois', status: TipoDemandaStatusEnum.PLANEJADA });
  assert.deepEqual([alterada.nome, alterada.horasEstimadas, alterada.status], ['Depois', 2, TipoDemandaStatusEnum.PLANEJADA]);

  await repositorio.excluir({ id: demanda.id });
  assert.equal(await repositorio.alterar({ id: demanda.id, nome: 'Fantasma' }), undefined);
});

testarComBanco('excluir faz soft delete; recuperarExcluida informa projeto e pai ativos; restaurar desfaz', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { projeto, raiz, a } = await montarArvore(conexao);
  await repositorio.excluir({ id: a.id });
  const { rows } = await conexao.raw('SELECT is_deleted, deleted_date FROM demanda WHERE id = :id', { id: a.id });
  assert.equal(rows[0].is_deleted, true);
  assert.ok(rows[0].deleted_date instanceof Date);

  assert.deepEqual(await repositorio.recuperarExcluida({ id: raiz.id }), null, 'ativa não conta como excluída');
  const excluida = await repositorio.recuperarExcluida({ id: a.id });
  assert.deepEqual([excluida?.projetoAtivo, excluida?.paiAtivo], [true, true]);

  await excluirLinha(conexao, 'demanda', raiz.id);
  assert.equal((await repositorio.recuperarExcluida({ id: a.id }))?.paiAtivo, false);
  await excluirLinha(conexao, 'projeto', projeto.id);
  assert.equal((await repositorio.recuperarExcluida({ id: a.id }))?.projetoAtivo, false);

  assert.equal((await repositorio.restaurar({ id: a.id })).id, a.id);
  assert.equal((await repositorio.recuperar({ id: a.id }))?.id, a.id);
});

testarComBanco('recuperarGrafo: nós do projeto (sem excluídos) e arestas de hierarquia e de conexão, só entre demandas ativas do projeto', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { projeto, raiz, a, b, a1 } = await montarArvore(conexao);
  const outroProjeto = await criarDemanda(conexao, {});
  await criarDemandaConexao(conexao, { demandaOrigemId: b.id, demandaDestinoId: a1.id });
  await criarDemandaConexao(conexao, { demandaOrigemId: b.id, demandaDestinoId: outroProjeto.id });
  const apagada = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Apagada' });
  await criarDemandaConexao(conexao, { demandaOrigemId: a.id, demandaDestinoId: apagada.id });
  await excluirLinha(conexao, 'demanda', apagada.id);

  const grafo = await repositorio.recuperarGrafo({ projetoId: projeto.id });
  assert.deepEqual(ids(grafo.nos).sort(), [raiz.id, a.id, b.id, a1.id].sort());
  const hierarquia = grafo.arestas.filter((aresta) => aresta.tipo === 'hierarquia').map((aresta) => [aresta.origemId, aresta.destinoId]);
  assert.equal(hierarquia.length, 3);
  const conexoes = grafo.arestas.filter((aresta) => aresta.tipo === 'conexao').map((aresta) => [aresta.origemId, aresta.destinoId]);
  assert.deepEqual(conexoes, [[b.id, a1.id]]);
});

testarComBanco('listarPlanejamento: só PENDENTE e PLANEJADA, com caminho, minutos e executores ativos', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const projeto = await criarProjeto(conexao);
  const pai = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Pai', isEstrutural: true, statusCodigo: 'PLANEJADA' });
  const filha = await criarDemanda(conexao, { projetoId: projeto.id, demandaPaiId: pai.id, nome: 'Filha', statusCodigo: 'PENDENTE' });
  await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Feita', statusCodigo: 'CONCLUIDA' });
  const executor = await criarDesenvolvedor(conexao, { nomeCompleto: 'Executora' });
  const atividade = await criarAtividade(conexao, { demandaId: filha.id, usuarioId: executor.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T09:00:00-03:00', fimData: '2026-01-15T10:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T11:00:00-03:00', fimData: null });

  const linhas = await repositorio.listarPlanejamento({ projetoId: projeto.id });
  assert.deepEqual(linhas.map((linha) => linha.demandaId).sort(), [pai.id, filha.id].sort());
  const dela = linhas.find((linha) => linha.demandaId === filha.id)!;
  assert.match(dela.caminho, /Pai.+Filha$/);
  assert.ok(dela.minutosExecutados >= 60, 'a execução aberta conta até agora');
  assert.deepEqual(dela.executoresAtivos.map((pessoa) => pessoa.nomeCompleto), ['Executora']);
});

testarComBanco('possuiFilhasOuAtividades só conta filha e atividade não excluídas', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const { raiz, a, b, a1 } = await montarArvore(conexao);
  assert.equal(await repositorio.possuiFilhasOuAtividades({ id: raiz.id }), true);
  assert.equal(await repositorio.possuiFilhasOuAtividades({ id: b.id }), false);

  const atividade = await criarAtividade(conexao, { demandaId: b.id });
  assert.equal(await repositorio.possuiFilhasOuAtividades({ id: b.id }), true);
  await excluirLinha(conexao, 'atividade', atividade.id);
  assert.equal(await repositorio.possuiFilhasOuAtividades({ id: b.id }), false);

  await excluirLinha(conexao, 'demanda', a1.id);
  assert.equal(await repositorio.possuiFilhasOuAtividades({ id: a.id }), false, 'a única filha foi excluída');
});

testarComBanco('contarAtividadesEmAberto não conta atividade excluída', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const demanda = await criarDemanda(conexao, {});
  const antes = await repositorio.contarAtividadesEmAberto({ id: demanda.id });
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id });
  assert.equal(await repositorio.contarAtividadesEmAberto({ id: demanda.id }), antes + 1);
  await excluirLinha(conexao, 'atividade', atividade.id);
  assert.equal(await repositorio.contarAtividadesEmAberto({ id: demanda.id }), antes);
});

// --- busca pelo nome, para as sugestões do `#` do chat entre colaboradores (task 211) -----------------

testarComBanco('buscarPorNome: acha pelo nome sem diferenciar maiúsculas, ignora excluída, e escapa % e _ (o texto digitado não é curinga)', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const projeto = await criarProjeto(conexao);
  const alvo = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Corrigir FILTRO das execuções 100%' });
  await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Outra coisa' });
  const excluida = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Filtro excluído' });
  await excluirLinha(conexao, 'demanda', excluida.id);

  const achadas = await repositorio.buscarPorNome({ texto: 'filtro', usuarioId: null, limite: 8 });
  assert.deepEqual(achadas.filter((demanda) => demanda.projetoId === projeto.id).map((demanda) => demanda.id), [alvo.id]);
  assert.equal(achadas.find((demanda) => demanda.id === alvo.id)?.status, 'PENDENTE');

  assert.equal((await repositorio.buscarPorNome({ texto: '100%', usuarioId: null, limite: 8 })).some((demanda) => demanda.id === alvo.id), true);
  assert.equal((await repositorio.buscarPorNome({ texto: '%', usuarioId: null, limite: 8 })).some((demanda) => demanda.id === alvo.id), true, 'só quem tem % no nome');
  assert.equal((await repositorio.buscarPorNome({ texto: 'Outr_ coisa', usuarioId: null, limite: 8 })).length, 0, '_ não é curinga');
});

testarComBanco('buscarPorNome: com usuarioId só entram demandas de projetos em que a pessoa tem demanda atribuída; respeita o limite', async (conexao) => {
  const repositorio = criarRepositorio(DemandaRepository, conexao);
  const dev = await criarDesenvolvedor(conexao);
  const projetoDele = await criarProjeto(conexao);
  const demandaDele = await criarDemanda(conexao, { projetoId: projetoDele.id, nome: 'Zq Visivel' });
  const irma = await criarDemanda(conexao, { projetoId: projetoDele.id, nome: 'Zq Irma no mesmo projeto' });
  await criarDemandaUsuario(conexao, { demandaId: demandaDele.id, usuarioId: dev.id });
  const alheia = await criarDemanda(conexao, { nome: 'Zq Alheia' });

  const dele = await repositorio.buscarPorNome({ texto: 'zq', usuarioId: dev.id, limite: 8 });
  assert.deepEqual(dele.map((demanda) => demanda.id).sort(), [demandaDele.id, irma.id].sort());
  assert.equal(dele.some((demanda) => demanda.id === alheia.id), false, 'projeto sem atribuição não aparece');

  const todas = await repositorio.buscarPorNome({ texto: 'zq', usuarioId: null, limite: 8 });
  assert.equal(todas.some((demanda) => demanda.id === alheia.id), true);
  assert.equal((await repositorio.buscarPorNome({ texto: 'zq', usuarioId: null, limite: 1 })).length, 1);
});
