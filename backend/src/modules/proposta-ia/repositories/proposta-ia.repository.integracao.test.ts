import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum, TipoPropostaIaEnum } from '@project20/shared';
import { testarComBanco, obterConexaoBancoTeste, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDesenvolvedor } from '../../../testes/fabricas';
import { PropostaIaRepository } from './proposta-ia.repository';

// Propostas da IA no SQL real (SYSTEM.SPEC.md §12 "proposta-ia"): a troca de situação é "comparar e trocar" atômica
// (`UPDATE ... WHERE status IN (...)`), só vale para o dono, e quem perde a corrida não recebe linha de volta.

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(PropostaIaRepository, conexao);
const { PENDENTE, CONFIRMADA, AJUSTADA, EXPIRADA, DESFEITA } = StatusPropostaIaEnum;

async function proporPara(conexao: ConexaoTeste, usuarioId: number, dados: Record<string, unknown> = { atividadeId: 1 }, tipo = TipoPropostaIaEnum.INICIAR_EXECUCAO) {
  return repositorioDe(conexao).criar({ usuarioId, tipo, dados });
}

const excluirProposta = (conexao: ConexaoTeste, id: number) =>
  conexao.raw('UPDATE proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE id = :id', { id });

testarComBanco('criar: nasce pendente, com tipo, dados e dono, sem resolução', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id, { atividadeId: 7, motivo: 'çã' }, TipoPropostaIaEnum.CRIAR_ATIVIDADE);

  assert.equal(proposta.status, PENDENTE);
  assert.equal(proposta.tipo, TipoPropostaIaEnum.CRIAR_ATIVIDADE);
  assert.equal(proposta.usuarioId, dono.id);
  assert.deepEqual(proposta.dados, { atividadeId: 7, motivo: 'çã' });
  assert.equal(proposta.resolucaoData, null);
  assert.equal(proposta.resultado, null);
});

testarComBanco('recuperarPorId: acha a proposta e não acha a excluída nem a inexistente', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id);
  assert.equal((await repositorioDe(conexao).recuperarPorId(proposta.id))?.id, proposta.id);

  await excluirProposta(conexao, proposta.id);
  assert.equal(await repositorioDe(conexao).recuperarPorId(proposta.id), undefined);
  assert.equal(await repositorioDe(conexao).recuperarPorId(999999999), undefined);
});

testarComBanco('listarPendentesDoUsuario: só as pendentes do usuário, da mais antiga para a mais nova', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const outro = await criarDesenvolvedor(conexao);
  const primeira = await proporPara(conexao, dono.id);
  const resolvida = await proporPara(conexao, dono.id);
  const excluida = await proporPara(conexao, dono.id);
  const segunda = await proporPara(conexao, dono.id);
  await proporPara(conexao, outro.id);
  await repositorioDe(conexao).transitar({ id: resolvida.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });
  await excluirProposta(conexao, excluida.id);

  const pendentes = await repositorioDe(conexao).listarPendentesDoUsuario(dono.id);
  assert.deepEqual(pendentes.map((proposta) => proposta.id), [primeira.id, segunda.id]);
});

testarComBanco('transitar: de pendente para confirmada grava a situação e a data de resolução', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id);

  const confirmada = await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });
  assert.equal(confirmada?.status, CONFIRMADA);
  assert.ok(confirmada?.resolucaoData);
  assert.deepEqual(confirmada?.dados, proposta.dados);
});

testarComBanco('transitar: o ajuste do usuário substitui os dados; sem ajuste os dados ficam como estão', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const ajustada = await proporPara(conexao, dono.id, { descricao: 'velha' });
  const mantida = await proporPara(conexao, dono.id, { descricao: 'igual' });

  const comAjuste = await repositorioDe(conexao).transitar({ id: ajustada.id, usuarioId: dono.id, de: [PENDENTE], para: AJUSTADA, dados: { descricao: 'nova' } });
  const semAjuste = await repositorioDe(conexao).transitar({ id: mantida.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });
  assert.deepEqual(comAjuste?.dados, { descricao: 'nova' });
  assert.deepEqual(semAjuste?.dados, { descricao: 'igual' });
});

testarComBanco('transitar: situação de partida diferente das aceitas não troca nada (quem perde a corrida recebe undefined)', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id);
  await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });

  assert.equal(await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: dono.id, de: [PENDENTE], para: EXPIRADA }), undefined);
  assert.equal((await repositorioDe(conexao).recuperarPorId(proposta.id))?.status, CONFIRMADA);
});

testarComBanco('transitar: aceita mais de uma situação de partida (confirmada ou ajustada → desfeita)', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const confirmada = await proporPara(conexao, dono.id);
  const ajustada = await proporPara(conexao, dono.id);
  await repositorioDe(conexao).transitar({ id: confirmada.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });
  await repositorioDe(conexao).transitar({ id: ajustada.id, usuarioId: dono.id, de: [PENDENTE], para: AJUSTADA });

  for (const proposta of [confirmada, ajustada]) {
    const desfeita = await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: dono.id, de: [CONFIRMADA, AJUSTADA], para: DESFEITA });
    assert.equal(desfeita?.status, DESFEITA);
  }
});

testarComBanco('transitar: proposta de outro usuário ou excluída não é alterada', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const intruso = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id);
  const excluida = await proporPara(conexao, dono.id);
  await excluirProposta(conexao, excluida.id);

  assert.equal(await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: intruso.id, de: [PENDENTE], para: CONFIRMADA }), undefined);
  assert.equal(await repositorioDe(conexao).transitar({ id: excluida.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA }), undefined);
  assert.equal((await repositorioDe(conexao).recuperarPorId(proposta.id))?.status, PENDENTE);
});

testarComBanco('transitar: voltar a pendente (compensação) limpa a data de resolução', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id);
  await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });

  const devolvida = await repositorioDe(conexao).transitar({ id: proposta.id, usuarioId: dono.id, de: [CONFIRMADA], para: PENDENTE });
  assert.equal(devolvida?.status, PENDENTE);
  assert.equal(devolvida?.resolucaoData, null);
  assert.equal((await repositorioDe(conexao).listarPendentesDoUsuario(dono.id)).length, 1);
});

testarComBanco('registrarResultado: guarda o que a ação criou e não mexe na situação', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const proposta = await proporPara(conexao, dono.id);

  const comResultado = await repositorioDe(conexao).registrarResultado(proposta.id, { atividadeId: 42 });
  assert.deepEqual(comResultado?.resultado, { atividadeId: 42 });
  assert.equal(comResultado?.status, PENDENTE);
});

// Corrida real: duas conexões do pool confirmam a mesma proposta ao mesmo tempo. A segunda espera o lock da linha, revê o
// WHERE depois do commit da primeira e não encontra mais PENDENTE: só uma vence.
test('transitar: duas confirmações concorrentes da mesma proposta, só uma vence', async () => {
  const banco = obterConexaoBancoTeste();
  const usuario = await banco.raw(`SELECT usuario.id FROM usuario WHERE usuario.login = 'gestor.inicial' AND usuario.is_deleted = false`);
  const usuarioId = usuario.rows[0].id as number;
  const repositorio = new PropostaIaRepository(banco);
  const proposta = await repositorio.criar({ usuarioId, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 1 } });
  try {
    const resultados = await Promise.all(
      [1, 2].map(() => repositorio.transitar({ id: proposta.id, usuarioId, de: [PENDENTE], para: CONFIRMADA })),
    );
    assert.equal(resultados.filter((resultado) => resultado !== undefined).length, 1);
    assert.equal((await repositorio.recuperarPorId(proposta.id))?.status, CONFIRMADA);
  } finally {
    await banco.raw('DELETE FROM proposta_ia WHERE id = :id', { id: proposta.id });
  }
});

const esperar = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

// Determinístico: uma transação resolve a proposta e segura a linha; a confirmação em outra conexão espera, revê o WHERE
// depois do commit e perde a corrida (undefined), sem sobrescrever a resolução da primeira.
test('transitar espera a linha travada por outra resolução e, vendo a proposta já resolvida, perde a corrida', async () => {
  const banco = obterConexaoBancoTeste();
  const usuario = await banco.raw(`SELECT usuario.id FROM usuario WHERE usuario.login = 'gestor.inicial' AND usuario.is_deleted = false`);
  const usuarioId = usuario.rows[0].id as number;
  const repositorio = new PropostaIaRepository(banco);
  const proposta = await repositorio.criar({ usuarioId, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 1 } });
  let terminou = false;
  let pendente: Promise<unknown> | undefined;
  try {
    await banco.transaction(async (primeira) => {
      await primeira.raw(
        `UPDATE proposta_ia SET tipo_proposta_ia_status_id = (SELECT id FROM tipo_proposta_ia_status WHERE codigo = 'CONFIRMADA') WHERE id = :id`,
        { id: proposta.id },
      );
      pendente = repositorio.transitar({ id: proposta.id, usuarioId, de: [PENDENTE], para: EXPIRADA }).then((resultado) => { terminou = true; return resultado; });
      await esperar(300);
      assert.equal(terminou, false, 'a segunda resolução deveria esperar a primeira terminar');
    });
    assert.equal(await pendente, undefined);
    assert.equal((await repositorio.recuperarPorId(proposta.id))?.status, CONFIRMADA);
  } finally {
    await pendente?.catch(() => undefined);
    await banco.raw('DELETE FROM proposta_ia WHERE id = :id', { id: proposta.id });
  }
});

testarComBanco('criar: por padrão a proposta não é da IA; com aplicadaPelaIa ela nasce marcada (task 228)', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const doUsuario = await proporPara(conexao, dono.id);
  assert.equal(doUsuario.aplicadaPelaIa, false);

  const daIa = await repositorioDe(conexao).criar({ usuarioId: dono.id, tipo: TipoPropostaIaEnum.INICIAR_EXECUCAO, dados: { atividadeId: 1 }, aplicadaPelaIa: true });
  assert.equal(daIa.aplicadaPelaIa, true);
  const confirmada = await repositorioDe(conexao).transitar({ id: daIa.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });
  assert.equal(confirmada?.aplicadaPelaIa, true, 'a marca acompanha a proposta depois de confirmada');
  assert.equal((await repositorioDe(conexao).recuperarPorId(daIa.id))?.aplicadaPelaIa, true);
});

testarComBanco('contarPendentesDoPlano: só as pendentes do tipo e do plano, de qualquer pessoa', async (conexao) => {
  const dono = await criarDesenvolvedor(conexao);
  const colega = await criarDesenvolvedor(conexao);
  const tipo = TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO;
  await proporPara(conexao, dono.id, { planoId: 7 }, tipo);
  await proporPara(conexao, colega.id, { planoId: 7 }, tipo);
  await proporPara(conexao, dono.id, { planoId: 8 }, tipo);
  await proporPara(conexao, dono.id, { planoId: 7 }, TipoPropostaIaEnum.CRIAR_ATIVIDADE);
  const resolvida = await proporPara(conexao, dono.id, { planoId: 7 }, tipo);
  await repositorioDe(conexao).transitar({ id: resolvida.id, usuarioId: dono.id, de: [PENDENTE], para: CONFIRMADA });
  const excluida = await proporPara(conexao, dono.id, { planoId: 7 }, tipo);
  await excluirProposta(conexao, excluida.id);

  assert.equal(await repositorioDe(conexao).contarPendentesDoPlano({ planoId: 7, tipo }), 2);
  assert.equal(await repositorioDe(conexao).contarPendentesDoPlano({ planoId: 9, tipo }), 0);
});
