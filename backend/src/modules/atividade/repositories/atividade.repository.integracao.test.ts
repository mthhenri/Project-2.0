import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import {
  criarAtividade, criarDemanda, criarDemandaUsuario, criarDesenvolvedor, criarExecucao, criarGestor, criarProjeto, criarTag, excluirLinha,
} from '../../../testes/fabricas';
import { AtividadeRepository } from './atividade.repository';

// Listagem (ordem pela prioridade, filtros da URL), tags, soft delete e restauração da atividade (SYSTEM.SPEC.md §12/§13 e SCHEMA.md).

const ids = (itens: Array<{ id: number }>) => itens.map((item) => item.id);
const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(AtividadeRepository, conexao);

/** Uma demanda com projeto e um desenvolvedor dono, para as atividades do cenário. */
async function cenario(conexao: ConexaoTeste, nomeUsuario = 'Ana Teste') {
  const projeto = await criarProjeto(conexao, { nome: 'Projeto Alfa' });
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Demanda Beta' });
  const usuario = await criarDesenvolvedor(conexao, { nomeCompleto: nomeUsuario });
  return { projeto, demanda, usuario };
}

// ---------------------------------------------------------------------------
// Ordenação da listagem (task 142)
// ---------------------------------------------------------------------------

testarComBanco('listar: ordena pela ordem da prioridade, da mais para a menos urgente, e INDEFINIDA por último', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const nasce = (prioridadeCodigo: string) => criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, prioridadeCodigo });
  const indefinida = await nasce('INDEFINIDA');
  const baixa = await nasce('BAIXA');
  const urgente = await nasce('URGENTE');
  const media = await nasce('MEDIA');
  const alta = await nasce('ALTA');

  const { itens } = await repositorioDe(conexao).listar({ demandaId: demanda.id });
  assert.deepEqual(ids(itens), [urgente.id, alta.id, media.id, baixa.id, indefinida.id]);
  assert.deepEqual(itens.map((item) => item.prioridade.ordem), [1, 2, 3, 4, 5]);
});

testarComBanco('listar: dentro da mesma prioridade ordena por executor, depois a mais nova primeiro, depois por nome', async (conexao) => {
  const { demanda } = await cenario(conexao);
  const ana = await criarDesenvolvedor(conexao, { nomeCompleto: 'Ana' });
  const bruno = await criarDesenvolvedor(conexao, { nomeCompleto: 'Bruno' });
  const nova = (dados: { usuarioId: number; nome: string; dataBase?: string }) =>
    criarAtividade(conexao, { demandaId: demanda.id, prioridadeCodigo: 'ALTA', ...dados });
  const doBruno = await nova({ usuarioId: bruno.id, nome: 'A do Bruno' });
  const anaAntiga = await nova({ usuarioId: ana.id, nome: 'Antiga', dataBase: '2026-01-10T12:00:00-03:00' });
  const anaNovaB = await nova({ usuarioId: ana.id, nome: 'B nova', dataBase: '2026-01-20T12:00:00-03:00' });
  const anaNovaA = await nova({ usuarioId: ana.id, nome: 'A nova', dataBase: '2026-01-20T12:00:00-03:00' });

  const { itens } = await repositorioDe(conexao).listar({ demandaId: demanda.id });
  assert.deepEqual(ids(itens), [anaNovaA.id, anaNovaB.id, anaAntiga.id, doBruno.id]);
});

testarComBanco('listar: a prioridade vence o executor (urgente de quem vem depois no alfabeto aparece antes)', async (conexao) => {
  const { demanda } = await cenario(conexao);
  const ana = await criarDesenvolvedor(conexao, { nomeCompleto: 'Ana' });
  const zeca = await criarDesenvolvedor(conexao, { nomeCompleto: 'Zeca' });
  const daAna = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: ana.id, prioridadeCodigo: 'BAIXA' });
  const doZeca = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: zeca.id, prioridadeCodigo: 'URGENTE' });
  assert.deepEqual(ids((await repositorioDe(conexao).listar({ demandaId: demanda.id })).itens), [doZeca.id, daAna.id]);
});

testarComBanco('listar: devolve a prioridade como objeto com codigo, descricao, ordem e cor', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, prioridadeCodigo: 'URGENTE' });
  const { itens } = await repositorioDe(conexao).listar({ demandaId: demanda.id });
  assert.deepEqual(itens[0].prioridade, { codigo: 'URGENTE', descricao: itens[0].prioridade.descricao, ordem: 1, cor: '#dc2626' });
});

// ---------------------------------------------------------------------------
// Filtros da URL (task 102)
// ---------------------------------------------------------------------------

testarComBanco('listar: filtra por demanda e por executor', async (conexao) => {
  const { projeto, demanda, usuario } = await cenario(conexao);
  const outraDemanda = await criarDemanda(conexao, { projetoId: projeto.id });
  const outroUsuario = await criarDesenvolvedor(conexao);
  const alvo = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const deOutroUsuario = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: outroUsuario.id });
  const deOutraDemanda = await criarAtividade(conexao, { demandaId: outraDemanda.id, usuarioId: usuario.id });
  const repositorio = repositorioDe(conexao);

  assert.deepEqual(ids((await repositorio.listar({ demandaId: demanda.id, usuarioId: usuario.id })).itens), [alvo.id]);
  assert.deepEqual(ids((await repositorio.listar({ demandaId: demanda.id })).itens).sort(), [alvo.id, deOutroUsuario.id].sort());
  assert.deepEqual(ids((await repositorio.listar({ usuarioId: usuario.id })).itens).sort(), [alvo.id, deOutraDemanda.id].sort());
});

testarComBanco('listar: filtra por um ou mais status', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const nova = (statusCodigo: string) => criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, statusCodigo });
  const planejada = await nova('PLANEJADA');
  const pendente = await nova('PENDENTE');
  const desenvolvendo = await nova('DESENVOLVENDO');
  await nova('DESENVOLVIDA');
  const repositorio = repositorioDe(conexao);

  assert.deepEqual(ids((await repositorio.listar({ demandaId: demanda.id, status: [TipoAtividadeStatusEnum.PENDENTE] })).itens), [pendente.id]);
  const duas = await repositorio.listar({ demandaId: demanda.id, status: [TipoAtividadeStatusEnum.PLANEJADA, TipoAtividadeStatusEnum.DESENVOLVENDO] });
  assert.deepEqual(ids(duas.itens).sort(), [planejada.id, desenvolvendo.id].sort());
  assert.equal((await repositorio.listar({ demandaId: demanda.id, status: [] })).total, 4, 'lista vazia não filtra');
});

testarComBanco('listar: a busca casa nome da atividade, da demanda e do projeto, sem distinguir maiúsculas', async (conexao) => {
  const projeto = await criarProjeto(conexao, { nome: 'Portal Cliente' });
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Relatório Mensal' });
  const usuario = await criarDesenvolvedor(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, nome: 'Corrigir Totais' });
  const repositorio = repositorioDe(conexao);

  for (const busca of ['totais', 'RELATÓRIO', 'portal', '  portal  ']) {
    assert.deepEqual(ids((await repositorio.listar({ busca })).itens), [atividade.id], busca);
  }
  assert.equal((await repositorio.listar({ busca: 'nada disso existe' })).total, 0);
  assert.equal((await repositorio.listar({ busca: '   ' })).total >= 1, true, 'busca em branco não filtra');
});

testarComBanco('listar: filtra pelo intervalo de data de criação, com os dois extremos incluídos', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const emDia = (dataBase: string) => criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, dataBase });
  const dia10 = await emDia('2026-02-10T12:00:00-03:00');
  const dia15 = await emDia('2026-02-15T12:00:00-03:00');
  const dia20 = await emDia('2026-02-20T12:00:00-03:00');
  const repositorio = repositorioDe(conexao);

  const intervalo = await repositorio.listar({ demandaId: demanda.id, dataInicio: '2026-02-15', dataFim: '2026-02-20' });
  assert.deepEqual(ids(intervalo.itens).sort(), [dia15.id, dia20.id].sort());
  assert.deepEqual(ids((await repositorio.listar({ demandaId: demanda.id, dataFim: '2026-02-10' })).itens), [dia10.id]);
  assert.deepEqual(ids((await repositorio.listar({ demandaId: demanda.id, dataInicio: '2026-02-20' })).itens), [dia20.id]);
});

testarComBanco('listar: pagina com o total do filtro e allRows ignora a paginação', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  for (let indice = 0; indice < 5; indice++) await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const repositorio = repositorioDe(conexao);

  const primeira = await repositorio.listar({ demandaId: demanda.id, pagina: 1, itensPorPagina: 2 });
  const terceira = await repositorio.listar({ demandaId: demanda.id, pagina: 3, itensPorPagina: 2 });
  assert.deepEqual([primeira.itens.length, primeira.total, terceira.itens.length, terceira.total], [2, 5, 1, 5]);
  assert.equal((await repositorio.listar({ demandaId: demanda.id, pagina: 1, itensPorPagina: 2, allRows: true })).itens.length, 5);
});

// ---------------------------------------------------------------------------
// Exclusão e o que a listagem não mostra
// ---------------------------------------------------------------------------

testarComBanco('listar: atividade excluída, de demanda excluída ou de projeto excluído não aparece', async (conexao) => {
  const { projeto, demanda, usuario } = await cenario(conexao);
  const visivel = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const excluida = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  await excluirLinha(conexao, 'atividade', excluida.id);

  const demandaExcluida = await criarDemanda(conexao, { projetoId: projeto.id });
  await criarAtividade(conexao, { demandaId: demandaExcluida.id, usuarioId: usuario.id });
  await excluirLinha(conexao, 'demanda', demandaExcluida.id);

  const projetoExcluido = await criarProjeto(conexao);
  const demandaDoProjetoExcluido = await criarDemanda(conexao, { projetoId: projetoExcluido.id });
  await criarAtividade(conexao, { demandaId: demandaDoProjetoExcluido.id, usuarioId: usuario.id });
  await excluirLinha(conexao, 'projeto', projetoExcluido.id);

  const { itens, total } = await repositorioDe(conexao).listar({ usuarioId: usuario.id });
  assert.deepEqual(ids(itens), [visivel.id]);
  assert.equal(total, 1);
});

testarComBanco('listar: atividade de usuário excluído não aparece', async (conexao) => {
  const { demanda } = await cenario(conexao);
  const sumido = await criarDesenvolvedor(conexao);
  await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: sumido.id });
  await excluirLinha(conexao, 'usuario', sumido.id);
  assert.equal((await repositorioDe(conexao).listar({ demandaId: demanda.id })).total, 0);
});

testarComBanco('excluir: faz soft delete — a atividade some da leitura mas a linha continua no banco', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const repositorio = repositorioDe(conexao);

  await repositorio.excluir({ id: atividade.id });

  assert.equal(await repositorio.recuperar({ id: atividade.id }), null);
  const linha = await conexao.raw('SELECT is_deleted, deleted_date FROM atividade WHERE id = :id', { id: atividade.id } as never);
  assert.equal(linha.rows[0].is_deleted, true);
  assert.notEqual(linha.rows[0].deleted_date, null);
});

testarComBanco('restaurar: recuperarExcluida só vê a excluída e informa se a demanda continua ativa; restaurar reativa sem cascata', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, nome: 'Voltar' });
  const repositorio = repositorioDe(conexao);

  assert.equal(await repositorio.recuperarExcluida({ id: atividade.id }), null, 'ativa não é "excluída"');

  await excluirLinha(conexao, 'atividade', atividade.id);
  assert.deepEqual(await repositorio.recuperarExcluida({ id: atividade.id }), { id: atividade.id, demandaId: demanda.id, nome: 'Voltar', usuarioId: usuario.id, demandaAtiva: true });

  await excluirLinha(conexao, 'demanda', demanda.id);
  assert.equal((await repositorio.recuperarExcluida({ id: atividade.id }))?.demandaAtiva, false);

  const restaurada = await repositorio.restaurar({ id: atividade.id });
  assert.deepEqual(restaurada, { id: atividade.id, demandaId: demanda.id, nome: 'Voltar' });
  const linha = await conexao.raw('SELECT is_deleted, deleted_date FROM atividade WHERE id = :id', { id: atividade.id } as never);
  assert.deepEqual([linha.rows[0].is_deleted, linha.rows[0].deleted_date], [false, null]);
  const demandaLinha = await conexao.raw('SELECT is_deleted FROM demanda WHERE id = :id', { id: demanda.id } as never);
  assert.equal(demandaLinha.rows[0].is_deleted, true, 'a demanda não é reativada em cascata');
});

// ---------------------------------------------------------------------------
// Execuções que a listagem resume
// ---------------------------------------------------------------------------

testarComBanco('listar: soma só os minutos das execuções encerradas e traz a execução ativa', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T09:00:00-03:00', fimData: '2026-01-15T10:30:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T11:00:00-03:00', fimData: '2026-01-15T11:15:00-03:00' });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T13:00:00-03:00', fimData: '2026-01-15T17:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', excluida.id);
  const ativa = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T14:00:00-03:00', fimData: null, descricao: 'Em andamento' });

  const [item] = (await repositorioDe(conexao).listar({ demandaId: demanda.id })).itens;
  assert.equal(item.totalMinutosExecutados, 105);
  assert.equal(item.totalExecucoes, 3, 'conta as encerradas e a ativa, não a excluída');
  assert.equal(item.execucaoAtivaId, ativa.id);
  assert.equal(item.execucaoAtivaDescricao, 'Em andamento');
});

testarComBanco('listar: sem execuções os minutos são 0 e não há execução ativa', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const [item] = (await repositorioDe(conexao).listar({ demandaId: demanda.id })).itens;
  assert.deepEqual([item.totalMinutosExecutados, item.totalExecucoes, item.execucaoAtivaId], [0, 0, null]);
});

testarComBanco('possuiExecucaoAtiva e possuiExecucao distinguem execução em andamento de execução qualquer', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const repositorio = repositorioDe(conexao);
  assert.deepEqual([await repositorio.possuiExecucaoAtiva({ id: atividade.id }), await repositorio.possuiExecucao({ id: atividade.id })], [false, false]);

  const encerrada = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T09:00:00-03:00', fimData: '2026-01-15T10:00:00-03:00' });
  assert.deepEqual([await repositorio.possuiExecucaoAtiva({ id: atividade.id }), await repositorio.possuiExecucao({ id: atividade.id })], [false, true]);

  const ativa = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T11:00:00-03:00', fimData: null });
  assert.equal(await repositorio.possuiExecucaoAtiva({ id: atividade.id }), true);

  await excluirLinha(conexao, 'execucao', ativa.id);
  await excluirLinha(conexao, 'execucao', encerrada.id);
  assert.deepEqual([await repositorio.possuiExecucaoAtiva({ id: atividade.id }), await repositorio.possuiExecucao({ id: atividade.id })], [false, false], 'excluída não conta');
});

// ---------------------------------------------------------------------------
// Inserir, recuperar e alterar
// ---------------------------------------------------------------------------

testarComBanco('inserir: grava status e prioridade pelos códigos e devolve a prioridade como objeto', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const criada = await repositorioDe(conexao).inserir({
    demandaId: demanda.id, usuarioId: usuario.id, nome: 'Nova', status: TipoAtividadeStatusEnum.PENDENTE, prioridade: TipoAtividadePrioridadeEnum.ALTA,
  } as never);
  assert.equal(criada.status, 'PENDENTE');
  assert.equal(criada.prioridade.codigo, 'ALTA');
  assert.equal(criada.prioridade.ordem, 2);
  assert.equal(criada.usuarioId, usuario.id);
});

testarComBanco('recuperar: traz demanda, projeto, executor e prioridade; atividade excluída vem nula', async (conexao) => {
  const { projeto, demanda, usuario } = await cenario(conexao, 'Carla');
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, nome: 'Detalhe', prioridadeCodigo: 'MEDIA' });
  const repositorio = repositorioDe(conexao);

  const recuperada = await repositorio.recuperar({ id: atividade.id });
  assert.equal(recuperada?.nome, 'Detalhe');
  assert.equal(recuperada?.nomeDemanda, 'Demanda Beta');
  assert.equal(recuperada?.projetoId, projeto.id);
  assert.equal(recuperada?.nomeProjeto, 'Projeto Alfa');
  assert.equal(recuperada?.nomeUsuario, 'Carla');
  assert.equal(recuperada?.usuarioTipo, 'DESENVOLVEDOR');
  assert.equal(recuperada?.prioridade.codigo, 'MEDIA');

  await excluirLinha(conexao, 'atividade', atividade.id);
  assert.equal(await repositorio.recuperar({ id: atividade.id }), null);
});

testarComBanco('recuperar: a posição da atividade é a ordem de criação entre as do mesmo executor, sem contar as excluídas', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const nova = (dataBase: string) => criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, dataBase });
  const primeira = await nova('2026-01-10T12:00:00-03:00');
  const excluida = await nova('2026-01-11T12:00:00-03:00');
  const terceira = await nova('2026-01-12T12:00:00-03:00');
  await excluirLinha(conexao, 'atividade', excluida.id);
  const repositorio = repositorioDe(conexao);

  assert.equal((await repositorio.recuperar({ id: primeira.id }))?.posicaoAtividadeUsuario, 1);
  assert.equal((await repositorio.recuperar({ id: terceira.id }))?.posicaoAtividadeUsuario, 2);
});

testarComBanco('alterar: muda só o que veio — nome, status e prioridade — e devolve o nome do executor', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao, 'Dora');
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, nome: 'Antes', statusCodigo: 'PLANEJADA', prioridadeCodigo: 'BAIXA' });
  const repositorio = repositorioDe(conexao);

  const soPrioridade = await repositorio.alterar({ id: atividade.id, prioridade: TipoAtividadePrioridadeEnum.URGENTE });
  assert.deepEqual([soPrioridade.nome, soPrioridade.status, soPrioridade.prioridade.codigo, soPrioridade.nomeUsuario], ['Antes', 'PLANEJADA', 'URGENTE', 'Dora']);

  const tudo = await repositorio.alterar({ id: atividade.id, nome: 'Depois', status: TipoAtividadeStatusEnum.DESENVOLVIDA, prioridade: TipoAtividadePrioridadeEnum.MEDIA });
  assert.deepEqual([tudo.nome, tudo.status, tudo.prioridade.codigo], ['Depois', 'DESENVOLVIDA', 'MEDIA']);
});

// ---------------------------------------------------------------------------
// Acesso à demanda
// ---------------------------------------------------------------------------

testarComBanco('validarAcessoDemanda: só vale com demanda_usuario ativa para aquele par; gestor sem vínculo não passa por aqui', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const outraDemanda = await criarDemanda(conexao);
  const gestor = await criarGestor(conexao);
  const repositorio = repositorioDe(conexao);
  assert.equal(await repositorio.validarAcessoDemanda({ demandaId: demanda.id, usuarioId: usuario.id }), false);

  const vinculo = await criarDemandaUsuario(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  assert.equal(await repositorio.validarAcessoDemanda({ demandaId: demanda.id, usuarioId: usuario.id }), true);
  assert.equal(await repositorio.validarAcessoDemanda({ demandaId: outraDemanda.id, usuarioId: usuario.id }), false, 'outra demanda');
  assert.equal(await repositorio.validarAcessoDemanda({ demandaId: demanda.id, usuarioId: gestor.id }), false, 'gestor não está em demanda_usuario');

  await excluirLinha(conexao, 'demanda_usuario', vinculo.id);
  assert.equal(await repositorio.validarAcessoDemanda({ demandaId: demanda.id, usuarioId: usuario.id }), false, 'vínculo excluído');
});

// ---------------------------------------------------------------------------
// Tags da atividade
// ---------------------------------------------------------------------------

testarComBanco('alterarTags: sincroniza com a lista — insere as novas, remove as que saíram e preserva as que ficam', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const [a, b, c] = [await criarTag(conexao), await criarTag(conexao), await criarTag(conexao)];
  const repositorio = repositorioDe(conexao);

  await repositorio.alterarTags({ atividadeId: atividade.id, tagIds: [a.id, b.id] });
  const antes = await conexao.raw('SELECT id FROM atividade_tag WHERE atividade_id = :id AND tag_id = :tagId AND is_deleted = false', { id: atividade.id, tagId: a.id } as never);

  await repositorio.alterarTags({ atividadeId: atividade.id, tagIds: [a.id, c.id] });

  assert.deepEqual(ids(await repositorio.listarTags({ atividadeId: atividade.id })).sort(), [a.id, c.id].sort());
  const depois = await conexao.raw('SELECT id FROM atividade_tag WHERE atividade_id = :id AND tag_id = :tagId AND is_deleted = false', { id: atividade.id, tagId: a.id } as never);
  assert.equal(depois.rows[0].id, antes.rows[0].id, 'a ligação que ficou não é recriada');
  const removida = await conexao.raw('SELECT is_deleted, deleted_date FROM atividade_tag WHERE atividade_id = :id AND tag_id = :tagId', { id: atividade.id, tagId: b.id } as never);
  assert.deepEqual([removida.rows[0].is_deleted, removida.rows[0].deleted_date !== null], [true, true], 'remover é soft delete');
});

testarComBanco('alterarTags: lista vazia tira todas, e uma tag removida pode voltar', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const tag = await criarTag(conexao);
  const repositorio = repositorioDe(conexao);

  await repositorio.alterarTags({ atividadeId: atividade.id, tagIds: [tag.id] });
  await repositorio.alterarTags({ atividadeId: atividade.id, tagIds: [] });
  assert.deepEqual(await repositorio.listarTags({ atividadeId: atividade.id }), []);

  await repositorio.alterarTags({ atividadeId: atividade.id, tagIds: [tag.id] });
  assert.deepEqual(ids(await repositorio.listarTags({ atividadeId: atividade.id })), [tag.id]);
});

testarComBanco('listarTags: tag excluída não aparece; a listagem leva as tags da atividade ordenadas por nome', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const zebra = await criarTag(conexao, { nome: 'Zebra' });
  const alfa = await criarTag(conexao, { nome: 'Alfa' });
  const sumida = await criarTag(conexao, { nome: 'Sumida' });
  const repositorio = repositorioDe(conexao);
  await repositorio.alterarTags({ atividadeId: atividade.id, tagIds: [zebra.id, alfa.id, sumida.id] });
  await excluirLinha(conexao, 'tag', sumida.id);

  assert.deepEqual(ids(await repositorio.listarTags({ atividadeId: atividade.id })).sort(), [alfa.id, zebra.id].sort());
  const [item] = (await repositorio.listar({ demandaId: demanda.id })).itens;
  assert.deepEqual(item.tags.map((tag) => tag.nome), ['Alfa', 'Zebra']);
});

testarComBanco('listar: atividade sem tags traz lista vazia', async (conexao) => {
  const { demanda, usuario } = await cenario(conexao);
  await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  assert.deepEqual((await repositorioDe(conexao).listar({ demandaId: demanda.id })).itens[0].tags, []);
});

// --- busca pelo nome, para as sugestões do `#` do chat entre colaboradores (task 211) -----------------

testarComBanco('buscarPorNome: acha pelo nome com a demanda e o projeto, ignora atividade e demanda excluídas, e escapa curingas', async (conexao) => {
  const repositorio = criarRepositorio(AtividadeRepository, conexao);
  const demanda = await criarDemanda(conexao, { nome: 'Autenticação Zk' });
  const alvo = await criarAtividade(conexao, { demandaId: demanda.id, nome: 'Tela de LOGIN Zk 50%' });
  const excluida = await criarAtividade(conexao, { demandaId: demanda.id, nome: 'Login Zk excluida' });
  await excluirLinha(conexao, 'atividade', excluida.id);
  const demandaExcluida = await criarDemanda(conexao, { nome: 'Demanda removida Zk' });
  await criarAtividade(conexao, { demandaId: demandaExcluida.id, nome: 'Login Zk de demanda removida' });
  await excluirLinha(conexao, 'demanda', demandaExcluida.id);

  const achadas = await repositorio.buscarPorNome({ texto: 'login zk', usuarioId: null, limite: 8 });
  assert.deepEqual(achadas.map((atividade) => atividade.id), [alvo.id]);
  assert.deepEqual([achadas[0].nomeDemanda, achadas[0].demandaId, achadas[0].projetoId, achadas[0].status], ['Autenticação Zk', demanda.id, demanda.projetoId, 'PENDENTE']);
  assert.equal((await repositorio.buscarPorNome({ texto: '50%', usuarioId: null, limite: 8 })).some((atividade) => atividade.id === alvo.id), true);
  assert.equal((await repositorio.buscarPorNome({ texto: 'Tela de LOGI_ Zk', usuarioId: null, limite: 8 })).length, 0, '_ não é curinga');
});

testarComBanco('buscarPorNome: com usuarioId só entram atividades de demandas em que a pessoa está atribuída', async (conexao) => {
  const repositorio = criarRepositorio(AtividadeRepository, conexao);
  const dev = await criarDesenvolvedor(conexao);
  const demandaDele = await criarDemanda(conexao);
  await criarDemandaUsuario(conexao, { demandaId: demandaDele.id, usuarioId: dev.id });
  const dela = await criarAtividade(conexao, { demandaId: demandaDele.id, nome: 'Zj Dela' });
  const alheia = await criarAtividade(conexao, { nome: 'Zj Alheia' });

  assert.deepEqual((await repositorio.buscarPorNome({ texto: 'zj', usuarioId: dev.id, limite: 8 })).map((atividade) => atividade.id), [dela.id]);
  const todas = (await repositorio.buscarPorNome({ texto: 'zj', usuarioId: null, limite: 8 })).map((atividade) => atividade.id);
  assert.deepEqual(todas.sort(), [dela.id, alheia.id].sort());
});

testarComBanco('alterar demandaId: muda a atividade de demanda e as execuções vão junto (task 229)', async (conexao) => {
  const { projeto, demanda, usuario } = await cenario(conexao);
  const destino = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Demanda Destino' });
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, nome: 'Mudar de lugar' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-01-15T09:00:00-03:00', fimData: '2026-01-15T10:00:00-03:00' });
  const repositorio = repositorioDe(conexao);

  const alterada = await repositorio.alterar({ id: atividade.id, demandaId: destino.id });
  assert.equal(alterada.demandaId, destino.id);
  assert.equal((await repositorio.recuperar({ id: atividade.id }))?.demandaId, destino.id);
  assert.equal(await repositorio.possuiExecucao({ id: atividade.id }), true, 'a execução continua ligada à atividade, agora na nova demanda');
  assert.deepEqual(ids((await repositorio.listar({ demandaId: destino.id, allRows: true } as never)).itens), [atividade.id]);
  assert.deepEqual(ids((await repositorio.listar({ demandaId: demanda.id, allRows: true } as never)).itens), []);

  const devolvida = await repositorio.alterar({ id: atividade.id, demandaId: demanda.id });
  assert.equal(devolvida.demandaId, demanda.id);
});

