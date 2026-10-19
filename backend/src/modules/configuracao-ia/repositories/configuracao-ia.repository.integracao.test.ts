import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfiguracaoIaCriarDto, EsforcoIaEnum, ModoContextoChatEnum, TipoProvedorIaEnum } from '@project20/shared';
import { testarComBanco, obterConexaoBancoTeste, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarAdministrador } from '../../../testes/fabricas';
import { ConfiguracaoIaRepository } from './configuracao-ia.repository';

// Configuração da IA no SQL real (SYSTEM.SPEC.md §12 "configuracao-ia"): uma linha por versão, a ativa é a de maior `versao`,
// a antiga nunca é alterada e a versão seguinte é serializada por lock consultivo. A migration 0033 deixa a versão 1 gravada.

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(ConfiguracaoIaRepository, conexao);

const NOVA: ConfiguracaoIaCriarDto = {
  provedor: TipoProvedorIaEnum.ANTHROPIC, modeloRapido: 'modelo-rapido', modeloPadrao: 'modelo-padrao', modeloAnalitico: 'modelo-analitico',
  esforcoAnalitico: EsforcoIaEnum.ALTO, checkinMinimoMinutos: 20, checkinMaximoMinutos: 60, duracaoRecomendadaMinutos: 45,
  checkinInteligente: false, rigorProporcional: false, deteccaoAutomatica: false,
  duvidasCodigo: true, modoContextoChat: ModoContextoChatEnum.SEPARADO, iaDesligada: true,
};

testarComBanco('recuperarAtiva: a versão de maior número, com provedor e nome de quem gravou', async (conexao) => {
  const administrador = await criarAdministrador(conexao, { nomeCompleto: 'Admin Teste' });
  const anterior = await repositorioDe(conexao).recuperarAtiva();
  const gravada = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);

  const ativa = await repositorioDe(conexao).recuperarAtiva();
  assert.equal(ativa?.id, gravada.id);
  assert.equal(ativa?.versao, (anterior?.versao ?? 0) + 1);
  assert.equal(ativa?.provedor, TipoProvedorIaEnum.ANTHROPIC);
  assert.equal(ativa?.modeloPadrao, 'modelo-padrao');
  assert.equal(ativa?.esforcoAnalitico, EsforcoIaEnum.ALTO);
  assert.equal(ativa?.duvidasCodigo, true);
  assert.equal(ativa?.modoContextoChat, ModoContextoChatEnum.SEPARADO);
  assert.equal(ativa?.iaDesligada, true);
  assert.equal(ativa?.usuarioId, administrador.id);
  assert.equal(ativa?.usuarioNome, 'Admin Teste');
});

testarComBanco('migration 0044: as versões que já existiam ficam "só Project" e com contexto misturado', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
  const { itens } = await repositorioDe(conexao).listar({ itensPorPagina: 100 });
  const primeira = itens.find((item) => item.versao === 1)!;
  assert.equal(primeira.duvidasCodigo, false);
  assert.equal(primeira.modoContextoChat, ModoContextoChatEnum.MISTURADO);
});

testarComBanco('inserirNovaVersao: a anterior continua intacta e o histórico lista as duas, da mais nova para a mais antiga', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const anterior = (await repositorioDe(conexao).recuperarAtiva())!;
  const nova = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);

  const { itens, total } = await repositorioDe(conexao).listar({});
  assert.equal(total >= 2, true);
  assert.deepEqual(itens.slice(0, 2).map((item) => item.id), [nova.id, anterior.id]);
  const anteriorDepois = itens.find((item) => item.id === anterior.id)!;
  assert.equal(anteriorDepois.modeloPadrao, anterior.modeloPadrao);
  assert.equal(anteriorDepois.versao, anterior.versao);
});

testarComBanco('inserirNovaVersao: duas gravações em sequência geram versões consecutivas', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const primeira = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
  const segunda = await repositorioDe(conexao).inserirNovaVersao({ ...NOVA, modeloPadrao: 'outro' }, administrador.id);
  assert.equal(segunda.versao, primeira.versao + 1);
  assert.equal((await repositorioDe(conexao).recuperarAtiva())?.modeloPadrao, 'outro');
});

testarComBanco('inserirNovaVersao: provedor inexistente falha e não grava versão', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const antes = (await repositorioDe(conexao).listar({})).total;
  await assert.rejects(
    () => repositorioDe(conexao).inserirNovaVersao({ ...NOVA, provedor: 'INEXISTENTE' as TipoProvedorIaEnum }, administrador.id),
    /Provedor de IA inexistente/,
  );
  assert.equal((await repositorioDe(conexao).listar({})).total, antes);
});

testarComBanco('versão excluída (soft delete) não é a ativa nem aparece no histórico', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  const anterior = (await repositorioDe(conexao).recuperarAtiva())!;
  const nova = await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
  await conexao.raw('UPDATE configuracao_ia SET is_deleted = true, deleted_date = NOW() WHERE id = :id', { id: nova.id });

  assert.equal((await repositorioDe(conexao).recuperarAtiva())?.id, anterior.id);
  assert.equal((await repositorioDe(conexao).listar({})).itens.some((item) => item.id === nova.id), false);
});

testarComBanco('listar: pagina o histórico e o total conta todas as versões', async (conexao) => {
  const administrador = await criarAdministrador(conexao);
  await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
  await repositorioDe(conexao).inserirNovaVersao(NOVA, administrador.id);
  const { total } = await repositorioDe(conexao).listar({});
  const primeiraPagina = await repositorioDe(conexao).listar({ pagina: 1, itensPorPagina: 1 });
  const segundaPagina = await repositorioDe(conexao).listar({ pagina: 2, itensPorPagina: 1 });
  assert.equal(primeiraPagina.itens.length, 1);
  assert.equal(segundaPagina.itens.length, 1);
  assert.equal(primeiraPagina.total, total);
  assert.equal(primeiraPagina.itens[0].versao, segundaPagina.itens[0].versao + 1);
});

// Corrida real: duas conexões do pool, cada uma com a sua transação, sem o rollback do teste. O lock consultivo serializa.
test('inserirNovaVersao: duas gravações concorrentes geram versões consecutivas, sem repetir número', async () => {
  const banco = obterConexaoBancoTeste();
  const usuario = await banco.raw(`SELECT usuario.id FROM usuario WHERE usuario.login = 'gestor.inicial' AND usuario.is_deleted = false`);
  const usuarioId = usuario.rows[0].id as number;
  const repositorio = new ConfiguracaoIaRepository(banco);
  const gravadas: number[] = [];
  try {
    const resultados = await Promise.all([
      repositorio.inserirNovaVersao({ ...NOVA, modeloPadrao: 'concorrente-a' }, usuarioId),
      repositorio.inserirNovaVersao({ ...NOVA, modeloPadrao: 'concorrente-b' }, usuarioId),
    ]);
    gravadas.push(...resultados.map((resultado) => resultado.id));
    const versoes = resultados.map((resultado) => resultado.versao).sort((a, b) => a - b);
    assert.equal(versoes[1], versoes[0] + 1);
    assert.equal((await repositorio.recuperarAtiva())?.versao, versoes[1]);
  } finally {
    if (gravadas.length > 0) await banco.raw('DELETE FROM configuracao_ia WHERE id = ANY(:ids)', { ids: gravadas });
  }
});

const esperar = (milissegundos: number) => new Promise((resolver) => setTimeout(resolver, milissegundos));

// Determinístico: uma transação segura o lock consultivo; a gravação em outra conexão tem de esperar por ele.
test('inserirNovaVersao espera o lock consultivo e só grava depois que a outra transação termina', async () => {
  const banco = obterConexaoBancoTeste();
  const usuario = await banco.raw(`SELECT usuario.id FROM usuario WHERE usuario.login = 'gestor.inicial' AND usuario.is_deleted = false`);
  const usuarioId = usuario.rows[0].id as number;
  const repositorio = new ConfiguracaoIaRepository(banco);
  let terminou = false;
  let pendente: Promise<{ id: number }> | undefined;
  try {
    await banco.transaction(async (segurando) => {
      await segurando.raw(`SELECT pg_advisory_xact_lock(hashtext('configuracao_ia'))`);
      pendente = repositorio.inserirNovaVersao({ ...NOVA, modeloPadrao: 'esperou' }, usuarioId).then((gravada) => { terminou = true; return gravada; });
      await esperar(300);
      assert.equal(terminou, false, 'a gravação não deveria passar enquanto outra transação segura o lock');
    });
    const gravada = await pendente;
    assert.equal(terminou, true);
    await banco.raw('DELETE FROM configuracao_ia WHERE id = :id', { id: gravada!.id });
  } finally {
    await pendente?.catch(() => undefined);
  }
});
