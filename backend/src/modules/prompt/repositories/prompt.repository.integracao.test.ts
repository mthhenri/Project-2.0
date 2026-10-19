import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPromptEnum } from '@project20/shared';
import { testarComBanco, obterConexaoBancoTeste, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAdministrador } from '../../../testes/fabricas';
import { PromptRepository } from './prompt.repository';

// Prompts no SQL real (SYSTEM.SPEC.md §12 "prompt"): por tipo, uma versão ativa e no máximo um rascunho; ativar troca a ativa,
// restaurar o padrão reativa a versão 1 sem apagar o histórico e as operações do mesmo tipo passam uma de cada vez.
// A migration 0034 deixa a versão 1 ativa de cada tipo.

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(PromptRepository, conexao);
const TIPO = TipoPromptEnum.PAD;
const OUTRO_TIPO = TipoPromptEnum.CHECKIN;

const versoesDe = async (conexao: ConexaoTeste, tipo: TipoPromptEnum = TIPO) => (await repositorioDe(conexao).listarVersoes(tipo, {})).itens;

testarComBanco('listarTipos: todos os tipos, cada um com a versão 1 ativa e sem rascunho de partida', async (conexao) => {
  const tipos = await repositorioDe(conexao).listarTipos();
  assert.deepEqual(tipos.map((item) => item.tipo).sort(), Object.values(TipoPromptEnum).sort());
  for (const item of tipos) {
    assert.equal(item.ativa.ativo, true, item.tipo);
    assert.equal(item.ativa.versao, 1, item.tipo);
    assert.equal(item.rascunho, null, item.tipo);
  }
});

testarComBanco('salvarRascunho: cria o rascunho como versão seguinte, inativo, e a ativa não muda', async (conexao) => {
  const administrador = await criarAdministrador(conexao, { nomeCompleto: 'Admin Teste' });
  const ativaAntes = (await repositorioDe(conexao).recuperarAtivo(TIPO))!;
  const rascunho = await repositorioDe(conexao).salvarRascunho(TIPO, 'texto novo', administrador.id);

  assert.equal(rascunho.versao, ativaAntes.versao + 1);
  assert.equal(rascunho.rascunho, true);
  assert.equal(rascunho.ativo, false);
  assert.equal(rascunho.conteudo, 'texto novo');
  assert.equal(rascunho.usuarioNome, 'Admin Teste');
  const ativaDepois = (await repositorioDe(conexao).recuperarAtivo(TIPO))!;
  assert.equal(ativaDepois.id, ativaAntes.id);
  assert.equal(ativaDepois.conteudo, ativaAntes.conteudo);
});

testarComBanco('salvarRascunho: salvar de novo troca o texto do mesmo rascunho (um por tipo, sem nova versão)', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const outroAdministrador = await criarAdministrador(conexao);
  const primeiro = await repositorioDe(conexao).salvarRascunho(TIPO, 'um', administrador.id);
  const segundo = await repositorioDe(conexao).salvarRascunho(TIPO, 'dois', outroAdministrador.id);

  assert.equal(segundo.id, primeiro.id);
  assert.equal(segundo.versao, primeiro.versao);
  assert.equal(segundo.conteudo, 'dois');
  assert.equal(segundo.usuarioId, outroAdministrador.id);
  assert.equal((await versoesDe(conexao)).filter((versao) => versao.rascunho).length, 1);
  assert.equal((await versoesDe(conexao)).length, 2);
});

testarComBanco('o rascunho de um tipo não aparece nem altera outro tipo', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  await repositorioDe(conexao).salvarRascunho(TIPO, 'só do pad', administrador.id);
  const tipos = await repositorioDe(conexao).listarTipos();
  assert.equal(tipos.find((item) => item.tipo === TIPO)?.rascunho?.conteudo, 'só do pad');
  assert.equal(tipos.find((item) => item.tipo === OUTRO_TIPO)?.rascunho, null);
  assert.equal((await versoesDe(conexao, OUTRO_TIPO)).length, 1);
});

testarComBanco('ativarRascunho: o rascunho vira a ativa e a anterior deixa de ser ativa (uma só ativa por tipo)', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const anterior = (await repositorioDe(conexao).recuperarAtivo(TIPO))!;
  const rascunho = await repositorioDe(conexao).salvarRascunho(TIPO, 'novo', administrador.id);

  const ativada = (await repositorioDe(conexao).ativarRascunho(TIPO))!;
  assert.equal(ativada.id, rascunho.id);
  assert.equal(ativada.ativo, true);
  assert.equal(ativada.rascunho, false);
  const versoes = await versoesDe(conexao);
  assert.deepEqual(versoes.filter((versao) => versao.ativo).map((versao) => versao.id), [rascunho.id]);
  assert.equal(versoes.find((versao) => versao.id === anterior.id)?.ativo, false);
  assert.equal((await repositorioDe(conexao).recuperarAtivo(TIPO))?.conteudo, 'novo');
});

testarComBanco('ativarRascunho: sem rascunho devolve undefined e a ativa continua a mesma', async (conexao) => {
  const ativa = (await repositorioDe(conexao).recuperarAtivo(TIPO))!;
  assert.equal(await repositorioDe(conexao).ativarRascunho(TIPO), undefined);
  assert.equal((await repositorioDe(conexao).recuperarAtivo(TIPO))?.id, ativa.id);
});

testarComBanco('restaurarPadrao: reativa a versão 1 e mantém o histórico das outras versões', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  await repositorioDe(conexao).salvarRascunho(TIPO, 'versão 2', administrador.id);
  const versaoDois = (await repositorioDe(conexao).ativarRascunho(TIPO))!;

  const restaurada = (await repositorioDe(conexao).restaurarPadrao(TIPO))!;
  assert.equal(restaurada.versao, 1);
  assert.equal(restaurada.ativo, true);
  const versoes = await versoesDe(conexao);
  assert.deepEqual(versoes.map((versao) => versao.versao), [2, 1]);
  assert.equal(versoes.find((versao) => versao.id === versaoDois.id)?.ativo, false);
  assert.equal(versoes.filter((versao) => versao.ativo).length, 1);
});

testarComBanco('restaurarPadrao com a versão 1 já ativa continua com uma só ativa', async (conexao) => {
  const restaurada = (await repositorioDe(conexao).restaurarPadrao(TIPO))!;
  assert.equal(restaurada.versao, 1);
  assert.equal((await versoesDe(conexao)).filter((versao) => versao.ativo).length, 1);
});

testarComBanco('descartarRascunho: exclui o rascunho (soft delete), devolve true uma vez e false depois', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const rascunho = await repositorioDe(conexao).salvarRascunho(TIPO, 'descartável', administrador.id);

  assert.equal(await repositorioDe(conexao).descartarRascunho(TIPO), true);
  assert.equal(await repositorioDe(conexao).descartarRascunho(TIPO), false);
  assert.equal((await versoesDe(conexao)).some((versao) => versao.id === rascunho.id), false);
  const linha = await conexao.raw('SELECT is_deleted FROM prompt WHERE id = :id', { id: rascunho.id });
  assert.equal(linha.rows[0].is_deleted, true);
  assert.equal((await repositorioDe(conexao).listarTipos()).find((item) => item.tipo === TIPO)?.rascunho, null);
});

testarComBanco('listarVersoes: da mais nova para a mais antiga, paginada e só do tipo pedido', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  await repositorioDe(conexao).salvarRascunho(TIPO, 'dois', administrador.id);
  await repositorioDe(conexao).ativarRascunho(TIPO);
  await repositorioDe(conexao).salvarRascunho(TIPO, 'três', administrador.id);

  const completa = await repositorioDe(conexao).listarVersoes(TIPO, {});
  assert.deepEqual(completa.itens.map((versao) => versao.versao), [3, 2, 1]);
  assert.equal(completa.total, 3);
  const segundaPagina = await repositorioDe(conexao).listarVersoes(TIPO, { pagina: 2, itensPorPagina: 2 });
  assert.deepEqual(segundaPagina.itens.map((versao) => versao.versao), [1]);
  assert.equal(segundaPagina.total, 3);
  assert.ok(completa.itens.every((versao) => versao.tipo === TIPO));
});

// Corrida real: duas conexões do pool salvam o rascunho do mesmo tipo ao mesmo tempo. Sem a trava da linha do tipo, as duas
// criariam a "versão seguinte" e a segunda esbarraria no índice único; com ela, a segunda só troca o texto do rascunho.
test('salvarRascunho: dois salvamentos concorrentes do mesmo tipo resultam em um só rascunho', async () => {
  const banco = obterConexaoBancoTeste();
  const usuario = await banco.raw(`SELECT usuario.id FROM usuario WHERE usuario.login = 'gestor.inicial' AND usuario.is_deleted = false`);
  const usuarioId = usuario.rows[0].id as number;
  const repositorio = new PromptRepository(banco);
  try {
    const resultados = await Promise.all([
      repositorio.salvarRascunho(TipoPromptEnum.PRIORIDADE, 'concorrente a', usuarioId),
      repositorio.salvarRascunho(TipoPromptEnum.PRIORIDADE, 'concorrente b', usuarioId),
    ]);
    assert.equal(resultados[0].id, resultados[1].id);
    const rascunhos = (await repositorio.listarVersoes(TipoPromptEnum.PRIORIDADE, {})).itens.filter((versao) => versao.rascunho);
    assert.equal(rascunhos.length, 1);
    assert.ok(['concorrente a', 'concorrente b'].includes(rascunhos[0].conteudo));
  } finally {
    await banco.raw(
      `DELETE FROM prompt USING tipo_prompt
       WHERE tipo_prompt.id = prompt.tipo_prompt_id AND tipo_prompt.codigo = :tipo AND prompt.rascunho = true`,
      { tipo: TipoPromptEnum.PRIORIDADE },
    );
  }
});

const esperar = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

// Determinístico: uma transação segura a linha do tipo; o salvamento em outra conexão tem de esperar por ela.
test('salvarRascunho espera a trava da linha do tipo e só segue depois que a outra transação termina', async () => {
  const banco = obterConexaoBancoTeste();
  const usuario = await banco.raw(`SELECT usuario.id FROM usuario WHERE usuario.login = 'gestor.inicial' AND usuario.is_deleted = false`);
  const usuarioId = usuario.rows[0].id as number;
  const repositorio = new PromptRepository(banco);
  let terminou = false;
  let pendente: Promise<unknown> | undefined;
  try {
    await banco.transaction(async (segurando) => {
      await segurando.raw(`SELECT tipo_prompt.id FROM tipo_prompt WHERE tipo_prompt.codigo = :tipo FOR NO KEY UPDATE`, { tipo: TipoPromptEnum.ENTREVISTA_DEMANDA });
      pendente = repositorio.salvarRascunho(TipoPromptEnum.ENTREVISTA_DEMANDA, 'esperou', usuarioId).then(() => { terminou = true; });
      await esperar(300);
      assert.equal(terminou, false, 'o salvamento não deveria passar enquanto outra transação trava o tipo');
    });
    await pendente;
    assert.equal(terminou, true);
  } finally {
    await pendente?.catch(() => undefined);
    await banco.raw(
      `DELETE FROM prompt USING tipo_prompt
       WHERE tipo_prompt.id = prompt.tipo_prompt_id AND tipo_prompt.codigo = :tipo AND prompt.rascunho = true`,
      { tipo: TipoPromptEnum.ENTREVISTA_DEMANDA },
    );
  }
});
