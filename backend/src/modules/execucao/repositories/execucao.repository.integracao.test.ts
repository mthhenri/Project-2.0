import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import {
  criarAtividade, criarDemanda, criarDesenvolvedor, criarExecucao, criarGestor, criarProjeto, excluirLinha,
} from '../../../testes/fabricas';
import { ExecucaoRepository } from './execucao.repository';

// Execução no SQL real (SYSTEM.SPEC.md §12–§14): a execução não tem coluna de usuário, o dono é `atividade.usuario_id`.
// `NOW()` fica congelado na transação de teste, então todo instante é explícito; a execução ativa começa no passado
// (relativo ao relógio real) para ter duração positiva.

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(ExecucaoRepository, conexao);
const ids = (itens: Array<{ id: number }>) => itens.map((item) => item.id);

/** Instante `minutos` antes de agora, no formato que o Postgres lê. */
const haMinutos = (minutos: number) => new Date(Date.now() - minutos * 60_000).toISOString();

/** Uma atividade com dono desenvolvedor (ou do tipo pedido) num projeto/demanda próprios. */
async function cenario(conexao: ConexaoTeste, nomeUsuario = 'Ana Teste') {
  const projeto = await criarProjeto(conexao, { nome: 'Projeto Alfa' });
  const demanda = await criarDemanda(conexao, { projetoId: projeto.id, nome: 'Demanda Beta' });
  const usuario = await criarDesenvolvedor(conexao, { nomeCompleto: nomeUsuario });
  const atividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id, nome: 'Atividade Gama' });
  return { projeto, demanda, usuario, atividade };
}

const INICIO = '2026-03-10T09:00:00-03:00';
const FIM = '2026-03-10T10:00:00-03:00';

// ---------------------------------------------------------------------------
// Execução ativa: uma por dono da atividade
// ---------------------------------------------------------------------------

testarComBanco('recuperarAtiva: acha a execução sem fim pelo DONO da atividade, em qualquer atividade dele', async (conexao) => {
  const { demanda, usuario, atividade } = await cenario(conexao);
  const outraAtividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T08:00:00-03:00', fimData: '2026-03-10T08:30:00-03:00' });
  const ativa = await criarExecucao(conexao, { atividadeId: outraAtividade.id, inicioData: haMinutos(30), fimData: null, descricao: 'em curso' });

  const encontrada = await repositorioDe(conexao).recuperarAtiva({ usuarioId: usuario.id });
  assert.equal(encontrada?.id, ativa.id);
  assert.equal(encontrada?.atividadeId, outraAtividade.id);
  assert.equal(encontrada?.descricao, 'em curso');
});

testarComBanco('recuperarAtiva: a execução ativa de um usuário não aparece para outro (o dono manda, não quem dispara)', async (conexao) => {
  const { atividade, usuario } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(10), fimData: null });
  assert.equal(await repositorioDe(conexao).recuperarAtiva({ usuarioId: outro.id }), null);
  assert.ok(await repositorioDe(conexao).recuperarAtiva({ usuarioId: usuario.id }));
});

testarComBanco('recuperarAtiva: execução encerrada, excluída ou de atividade excluída não conta', async (conexao) => {
  const { demanda, usuario, atividade } = await cenario(conexao);
  const atividadeExcluida = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(90), fimData: haMinutos(60) });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(30), fimData: null });
  await excluirLinha(conexao, 'execucao', excluida.id);
  await criarExecucao(conexao, { atividadeId: atividadeExcluida.id, inicioData: haMinutos(20), fimData: null });
  await excluirLinha(conexao, 'atividade', atividadeExcluida.id);
  assert.equal(await repositorioDe(conexao).recuperarAtiva({ usuarioId: usuario.id }), null);
});

testarComBanco('recuperarUsuario e recuperarTipoUsuarioDaAtividade: o dono vem de atividade.usuario_id', async (conexao) => {
  const { atividade, usuario } = await cenario(conexao);
  const gestor = await criarGestor(conexao);
  const atividadeDoGestor = await criarAtividade(conexao, { usuarioId: gestor.id });
  const execucao = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  const repo = repositorioDe(conexao);

  assert.equal(await repo.recuperarUsuario({ execucaoId: execucao.id }), usuario.id);
  assert.equal(await repo.recuperarUsuario({ execucaoId: 999999 }), null);
  assert.equal(await repo.recuperarTipoUsuarioDaAtividade({ atividadeId: atividade.id }), TipoUsuarioEnum.DESENVOLVEDOR);
  assert.equal(await repo.recuperarTipoUsuarioDaAtividade({ atividadeId: atividadeDoGestor.id }), TipoUsuarioEnum.GESTOR);
  assert.equal(await repo.recuperarTipoUsuarioDaAtividade({ atividadeId: 999999 }), null);

  await excluirLinha(conexao, 'execucao', execucao.id);
  assert.equal(await repo.recuperarUsuario({ execucaoId: execucao.id }), null);
});

// ---------------------------------------------------------------------------
// Inserir, registrar, encerrar, alterar
// ---------------------------------------------------------------------------

testarComBanco('inserir: grava a execução em andamento (sem fim) com o início informado', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const inicio = new Date(haMinutos(5));
  const inserida = await repositorioDe(conexao).inserir({ atividadeId: atividade.id, descricao: 'começo', inicioData: inicio });
  assert.equal(inserida.fimData, null);
  assert.equal(inserida.descricao, 'começo');
  assert.equal(new Date(inserida.inicioData).getTime(), inicio.getTime());
  assert.equal((await repositorioDe(conexao).recuperarAtiva({ usuarioId: (await repositorioDe(conexao).recuperarUsuario({ execucaoId: inserida.id }))! }))?.id, inserida.id);
});

testarComBanco('registrar: grava a execução já encerrada e calcula a duração em minutos', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const registrada = await repositorioDe(conexao).registrar({
    atividadeId: atividade.id, descricao: 'feito', inicioData: new Date(INICIO), fimData: new Date('2026-03-10T10:25:00-03:00'),
  });
  assert.equal(registrada.duracaoMinutos, 85);
  assert.notEqual(registrada.fimData, null);
});

testarComBanco('encerrar: define o fim e a descrição, calcula a duração e ignora execução excluída', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const aberta = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: null, descricao: 'provisória' });
  const repo = repositorioDe(conexao);

  const encerrada = await repo.encerrar({ id: aberta.id, fimData: new Date(FIM), descricao: 'final' });
  assert.equal(encerrada.descricao, 'final');
  assert.equal(encerrada.duracaoMinutos, 60);
  assert.equal(await repo.recuperarAtiva({ usuarioId: (await repo.recuperarUsuario({ execucaoId: aberta.id }))! }), null);

  await excluirLinha(conexao, 'execucao', aberta.id);
  const aposExclusao = await repo.encerrar({ id: aberta.id, fimData: new Date(FIM), descricao: 'outra' });
  assert.equal(aposExclusao, undefined);
});

testarComBanco('alterar: muda descrição, início e fim; fim nulo reabre a execução', async (conexao) => {
  const { atividade, usuario } = await cenario(conexao);
  const execucao = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM, descricao: 'antes' });
  const repo = repositorioDe(conexao);

  const alterada = await repo.alterar({ id: execucao.id, descricao: 'depois', inicioData: new Date('2026-03-10T08:30:00-03:00'), fimData: new Date(FIM) });
  assert.equal(alterada.descricao, 'depois');
  assert.equal(alterada.duracaoMinutos, 90);

  const reaberta = await repo.alterar({ id: execucao.id, descricao: 'reaberta', inicioData: new Date(haMinutos(15)), fimData: null });
  assert.equal(reaberta.fimData, null);
  assert.equal((await repo.recuperarAtiva({ usuarioId: usuario.id }))?.id, execucao.id);
});

testarComBanco('recuperar: devolve a duração só quando encerrada; excluída ou inexistente é null', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const encerrada = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  const aberta = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(5), fimData: null });
  const repo = repositorioDe(conexao);

  assert.equal((await repo.recuperar({ id: encerrada.id }))?.duracaoMinutos, 60);
  assert.equal((await repo.recuperar({ id: aberta.id }))?.duracaoMinutos, null);
  await excluirLinha(conexao, 'execucao', encerrada.id);
  assert.equal(await repo.recuperar({ id: encerrada.id }), null);
  assert.equal(await repo.recuperar({ id: 999999 }), null);
});

testarComBanco('excluir: soft delete — a linha continua no banco, marcada, e some das leituras', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const execucao = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  const repo = repositorioDe(conexao);
  await repo.excluir({ id: execucao.id });

  const linha = await conexao('execucao').where({ id: execucao.id }).first();
  assert.equal(linha.is_deleted, true);
  assert.notEqual(linha.deleted_date, null);
  assert.equal(await repo.recuperar({ id: execucao.id }), null);
  assert.deepEqual((await repo.listar({ atividadeId: atividade.id })).itens, []);
});

// ---------------------------------------------------------------------------
// Sobreposição
// ---------------------------------------------------------------------------

testarComBanco('validarSobreposicao: encostadas não sobrepõem; contidas, cruzadas e envolventes sim', async (conexao) => {
  const { atividade, usuario } = await cenario(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T09:00:00-03:00', fimData: '2026-03-10T10:00:00-03:00' });
  const repo = repositorioDe(conexao);
  const sobrepoe = (inicio: string, fim: string) => repo.validarSobreposicao({ usuarioId: usuario.id, inicioData: new Date(inicio), fimData: new Date(fim) });

  assert.equal(await sobrepoe('2026-03-10T08:00:00-03:00', '2026-03-10T09:00:00-03:00'), false, 'termina quando a outra começa');
  assert.equal(await sobrepoe('2026-03-10T10:00:00-03:00', '2026-03-10T11:00:00-03:00'), false, 'começa quando a outra termina');
  assert.equal(await sobrepoe('2026-03-10T09:15:00-03:00', '2026-03-10T09:45:00-03:00'), true, 'contida');
  assert.equal(await sobrepoe('2026-03-10T08:30:00-03:00', '2026-03-10T09:30:00-03:00'), true, 'cruza o começo');
  assert.equal(await sobrepoe('2026-03-10T09:30:00-03:00', '2026-03-10T10:30:00-03:00'), true, 'cruza o fim');
  assert.equal(await sobrepoe('2026-03-10T08:00:00-03:00', '2026-03-10T11:00:00-03:00'), true, 'envolve a outra');
  assert.equal(await sobrepoe('2026-03-10T09:00:00-03:00', '2026-03-10T10:00:00-03:00'), true, 'idêntica');
});

testarComBanco('validarSobreposicao: execução ativa vale até o infinito; só conta as do mesmo dono', async (conexao) => {
  const { atividade, usuario } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T09:00:00-03:00', fimData: null });
  const repo = repositorioDe(conexao);
  const periodo = { inicioData: new Date('2026-03-12T09:00:00-03:00'), fimData: new Date('2026-03-12T10:00:00-03:00') };

  assert.equal(await repo.validarSobreposicao({ usuarioId: usuario.id, ...periodo }), true, 'depois do início da ativa');
  assert.equal(await repo.validarSobreposicao({ usuarioId: usuario.id, inicioData: new Date('2026-03-10T07:00:00-03:00'), fimData: new Date('2026-03-10T09:00:00-03:00') }), false, 'antes da ativa');
  assert.equal(await repo.validarSobreposicao({ usuarioId: outro.id, ...periodo }), false, 'outro dono');
});

testarComBanco('validarSobreposicao: ignora a execução excluída, a de atividade excluída e a que está sendo corrigida', async (conexao) => {
  const { demanda, usuario, atividade } = await cenario(conexao);
  const atividadeExcluida = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const periodo = { inicioData: new Date(INICIO), fimData: new Date(FIM) };
  const doRepo = repositorioDe(conexao);

  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  await excluirLinha(conexao, 'execucao', excluida.id);
  await criarExecucao(conexao, { atividadeId: atividadeExcluida.id, inicioData: INICIO, fimData: FIM });
  await excluirLinha(conexao, 'atividade', atividadeExcluida.id);
  assert.equal(await doRepo.validarSobreposicao({ usuarioId: usuario.id, ...periodo }), false);

  const emCorrecao = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  assert.equal(await doRepo.validarSobreposicao({ usuarioId: usuario.id, ...periodo }), true);
  assert.equal(await doRepo.validarSobreposicao({ usuarioId: usuario.id, ...periodo, ignorarExecucaoId: emCorrecao.id }), false);
});

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------

testarComBanco('listar: ordena por nome do usuário e depois por início, e devolve os nomes de usuário, atividade, demanda e projeto', async (conexao) => {
  const { atividade: deAna, demanda } = await cenario(conexao, 'Ana');
  const bruno = await criarDesenvolvedor(conexao, { nomeCompleto: 'Bruno' });
  const deBruno = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: bruno.id });
  const bruno2 = await criarExecucao(conexao, { atividadeId: deBruno.id, inicioData: '2026-03-10T13:00:00-03:00', fimData: '2026-03-10T14:00:00-03:00' });
  const bruno1 = await criarExecucao(conexao, { atividadeId: deBruno.id, inicioData: '2026-03-10T08:00:00-03:00', fimData: '2026-03-10T09:00:00-03:00' });
  const ana1 = await criarExecucao(conexao, { atividadeId: deAna.id, inicioData: '2026-03-10T15:00:00-03:00', fimData: '2026-03-10T16:00:00-03:00', descricao: 'trabalho da Ana' });

  const { itens, total } = await repositorioDe(conexao).listar({ data: '2026-03-10' });
  assert.deepEqual(ids(itens), [ana1.id, bruno1.id, bruno2.id]);
  assert.equal(total, 3);
  assert.equal(itens[0].nomeUsuario, 'Ana');
  assert.equal(itens[0].nomeAtividade, 'Atividade Gama');
  assert.equal(itens[0].nomeDemanda, 'Demanda Beta');
  assert.equal(itens[0].nomeProjeto, 'Projeto Alfa');
  assert.equal(itens[0].descricao, 'trabalho da Ana');
  assert.equal(itens[0].duracaoMinutos, 60);
});

testarComBanco('listar: a restrição do desenvolvedor vence o filtro de usuário pedido', async (conexao) => {
  const { atividade: deAna, usuario: ana, demanda } = await cenario(conexao, 'Ana');
  const bruno = await criarDesenvolvedor(conexao, { nomeCompleto: 'Bruno' });
  const deBruno = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: bruno.id });
  const daAna = await criarExecucao(conexao, { atividadeId: deAna.id, inicioData: INICIO, fimData: FIM });
  const doBruno = await criarExecucao(conexao, { atividadeId: deBruno.id, inicioData: INICIO, fimData: FIM });
  const repo = repositorioDe(conexao);

  assert.deepEqual(ids((await repo.listar({ usuarioId: bruno.id }, { usuarioId: ana.id })).itens), [daAna.id]);
  assert.deepEqual(ids((await repo.listar({ usuarioId: bruno.id })).itens), [doBruno.id]);
  assert.deepEqual(ids((await repo.listar({})).itens).sort(), [daAna.id, doBruno.id].sort());
});

testarComBanco('listar: filtra por atividade e por data (o dia de início, no fuso do sistema)', async (conexao) => {
  const { atividade, demanda, usuario } = await cenario(conexao);
  const outraAtividade = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  const dia10 = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  const dia11 = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-11T09:00:00-03:00', fimData: '2026-03-11T10:00:00-03:00' });
  const daOutra = await criarExecucao(conexao, { atividadeId: outraAtividade.id, inicioData: INICIO, fimData: FIM });
  const repo = repositorioDe(conexao);

  assert.deepEqual(ids((await repo.listar({ atividadeId: atividade.id, data: '2026-03-10' })).itens), [dia10.id]);
  assert.deepEqual(ids((await repo.listar({ atividadeId: atividade.id, data: '2026-03-11' })).itens), [dia11.id]);
  assert.deepEqual(ids((await repo.listar({ atividadeId: outraAtividade.id })).itens), [daOutra.id]);
});

testarComBanco('listar: início às 23h30 do fuso do sistema fica no mesmo dia, mesmo já sendo o dia seguinte em UTC', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const tarde = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T23:30:00-03:00', fimData: '2026-03-10T23:50:00-03:00' });
  const repo = repositorioDe(conexao);
  assert.deepEqual(ids((await repo.listar({ data: '2026-03-10' })).itens), [tarde.id]);
  assert.deepEqual((await repo.listar({ data: '2026-03-11' })).itens, []);
});

testarComBanco('listar: totalMinutosDia soma as execuções filtradas, contando a ativa até agora', async (conexao) => {
  const { atividade } = await cenario(conexao);
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T08:00:00-03:00', fimData: '2026-03-10T09:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T10:00:00-03:00', fimData: '2026-03-10T10:30:00-03:00' });
  const repo = repositorioDe(conexao);
  assert.equal((await repo.listar({ data: '2026-03-10' })).totalMinutosDia, 90);

  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(30), fimData: null });
  const comAtiva = await repo.listar({ atividadeId: atividade.id });
  assert.ok(comAtiva.totalMinutosDia >= 90 + 29 && comAtiva.totalMinutosDia <= 90 + 31, `era ${comAtiva.totalMinutosDia}`);
});

testarComBanco('listar: pagina com total real e allRows ignora a paginação', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const criadas = [];
  for (let hora = 8; hora < 13; hora++) {
    criadas.push(await criarExecucao(conexao, {
      atividadeId: atividade.id, inicioData: `2026-03-10T${String(hora).padStart(2, '0')}:00:00-03:00`, fimData: `2026-03-10T${String(hora).padStart(2, '0')}:30:00-03:00`,
    }));
  }
  const repo = repositorioDe(conexao);
  const segundaPagina = await repo.listar({ pagina: 2, itensPorPagina: 2 });
  assert.equal(segundaPagina.total, 5);
  assert.deepEqual(ids(segundaPagina.itens), [criadas[2].id, criadas[3].id]);
  assert.equal((await repo.listar({ allRows: true, itensPorPagina: 2 })).itens.length, 5);
});

testarComBanco('listar: execução excluída e execução de atividade, demanda, projeto ou usuário excluído ficam fora', async (conexao) => {
  const { atividade, demanda, projeto, usuario } = await cenario(conexao);
  const visivel = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  const repo = repositorioDe(conexao);

  const execucaoExcluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T11:00:00-03:00', fimData: '2026-03-10T12:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', execucaoExcluida.id);
  assert.deepEqual(ids((await repo.listar({ data: '2026-03-10' })).itens), [visivel.id]);

  for (const [tabela, id] of [['atividade', atividade.id], ['demanda', demanda.id], ['projeto', projeto.id], ['usuario', usuario.id]] as const) {
    // O soft delete de cada nível esconde a execução da listagem; o `excluirLinha` da fábrica só marca a linha, sem cascata.
    await excluirLinha(conexao, tabela, id);
    assert.deepEqual((await repo.listar({ data: '2026-03-10' })).itens, [], `${tabela} excluído`);
    await conexao(tabela).where({ id }).update({ is_deleted: false, deleted_date: null });
  }
});

// ---------------------------------------------------------------------------
// Última por atividade, agrupamento por dia, auto-stop, relatório
// ---------------------------------------------------------------------------

testarComBanco('listarUltimaPorAtividade: a última data de cada atividade; sem execução não vem; lista vazia não consulta', async (conexao) => {
  const { atividade, demanda, usuario } = await cenario(conexao);
  const semExecucao = await criarAtividade(conexao, { demandaId: demanda.id, usuarioId: usuario.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-09T09:00:00-03:00', fimData: '2026-03-09T10:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T09:00:00-03:00', fimData: '2026-03-10T10:00:00-03:00' });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-12T09:00:00-03:00', fimData: '2026-03-12T10:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', excluida.id);
  const repo = repositorioDe(conexao);

  const ultimas = await repo.listarUltimaPorAtividade({ atividadeIds: [atividade.id, semExecucao.id] });
  assert.equal(ultimas.length, 1);
  assert.equal(ultimas[0].atividadeId, atividade.id);
  assert.equal(new Date(ultimas[0].ultimaData).getTime(), new Date('2026-03-10T10:00:00-03:00').getTime());
  assert.deepEqual(await repo.listarUltimaPorAtividade({ atividadeIds: [] }), []);
});

testarComBanco('agruparPorDia: primeiro início, último fim e minutos por dia, só do usuário; ativa e excluída não somam', async (conexao) => {
  const { atividade, usuario } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const deOutro = await criarAtividade(conexao, { usuarioId: outro.id });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T08:00:00-03:00', fimData: '2026-03-10T09:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T13:00:00-03:00', fimData: '2026-03-10T13:30:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-11T08:00:00-03:00', fimData: '2026-03-11T08:45:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-12T08:00:00-03:00', fimData: null });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-13T07:40:00-03:00', fimData: '2026-03-13T10:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-13T11:10:00-03:00', fimData: null });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T15:00:00-03:00', fimData: '2026-03-10T16:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', excluida.id);
  await criarExecucao(conexao, { atividadeId: deOutro.id, inicioData: '2026-03-10T08:00:00-03:00', fimData: '2026-03-10T12:00:00-03:00' });

  const dias = await repositorioDe(conexao).agruparPorDia({ usuarioId: usuario.id, dataInicio: '2026-03-10', dataFim: '2026-03-12' });
  assert.deepEqual(dias.map((dia) => [dia.dia, dia.totalMinutosTrabalhados]), [['2026-03-10', 90], ['2026-03-11', 45], ['2026-03-12', 0]]);
  assert.equal(new Date(dias[0].primeiroInicioData).getTime(), new Date('2026-03-10T08:00:00-03:00').getTime());
  assert.equal(new Date(dias[0].ultimoFimData!).getTime(), new Date('2026-03-10T13:30:00-03:00').getTime());

  // P-063: o dia com execução em andamento não tem último fim (nem o de uma encerrada antes dela).
  const comAtiva = await repositorioDe(conexao).agruparPorDia({ usuarioId: usuario.id, dataInicio: '2026-03-12', dataFim: '2026-03-13' });
  assert.deepEqual(comAtiva.map((dia) => [dia.dia, dia.ultimoFimData, dia.totalMinutosTrabalhados]), [['2026-03-12', null, 0], ['2026-03-13', null, 140]]);

  const soUmDia = await repositorioDe(conexao).agruparPorDia({ usuarioId: usuario.id, dataInicio: '2026-03-11', dataFim: '2026-03-11' });
  assert.deepEqual(soUmDia.map((dia) => dia.dia), ['2026-03-11']);
});

testarComBanco('encerrarTodasAbertas: fecha todas as abertas de todos os usuários e deixa encerradas e excluídas como estão', async (conexao) => {
  const { atividade } = await cenario(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const deOutro = await criarAtividade(conexao, { usuarioId: outro.id });
  const aberta1 = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(40), fimData: null });
  const aberta2 = await criarExecucao(conexao, { atividadeId: deOutro.id, inicioData: haMinutos(20), fimData: null });
  const encerrada = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: haMinutos(10), fimData: null });
  await excluirLinha(conexao, 'execucao', excluida.id);

  const fechadas = await repositorioDe(conexao).encerrarTodasAbertas();
  assert.deepEqual(ids(fechadas).sort(), [aberta1.id, aberta2.id].sort());
  for (const execucao of fechadas) assert.notEqual(execucao.fimData, null);

  const nobanco = (id: number) => conexao('execucao').where({ id }).first();
  assert.notEqual((await nobanco(aberta1.id)).fim_data, null);
  assert.equal(new Date((await nobanco(encerrada.id)).fim_data).getTime(), new Date(FIM).getTime());
  assert.equal((await nobanco(excluida.id)).fim_data, null, 'a excluída não é tocada');
  assert.deepEqual(await repositorioDe(conexao).encerrarTodasAbertas(), [], 'segunda chamada não encontra nada');
});

testarComBanco('listarParaRelatorio: só o projeto e o intervalo pedidos, com status da atividade, e nada de excluído', async (conexao) => {
  const { atividade, projeto } = await cenario(conexao);
  const outroProjeto = await criarProjeto(conexao);
  const demandaOutra = await criarDemanda(conexao, { projetoId: outroProjeto.id });
  const atividadeOutra = await criarAtividade(conexao, { demandaId: demandaOutra.id });
  const dentro = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: INICIO, fimData: FIM, descricao: 'no relatório' });
  await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-04-10T09:00:00-03:00', fimData: '2026-04-10T10:00:00-03:00' });
  await criarExecucao(conexao, { atividadeId: atividadeOutra.id, inicioData: INICIO, fimData: FIM });
  const excluida = await criarExecucao(conexao, { atividadeId: atividade.id, inicioData: '2026-03-10T11:00:00-03:00', fimData: '2026-03-10T12:00:00-03:00' });
  await excluirLinha(conexao, 'execucao', excluida.id);

  const linhas = await repositorioDe(conexao).listarParaRelatorio({ projetoId: projeto.id, dataInicio: '2026-03-01', dataFim: '2026-03-31' });
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].descricao, 'no relatório');
  assert.equal(linhas[0].dataExecucao, '2026-03-10');
  assert.equal(linhas[0].duracaoMinutos, 60);
  assert.equal(linhas[0].nomeProjeto, 'Projeto Alfa');
  assert.equal(linhas[0].nomeAtividade, 'Atividade Gama');
  assert.equal(linhas[0].statusAtividade, 'PENDENTE');
  assert.ok(dentro.id);
});
