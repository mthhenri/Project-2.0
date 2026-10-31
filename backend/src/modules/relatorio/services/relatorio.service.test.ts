import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { RelatorioFormatoEnum, RelatorioPeriodoTipoEnum, NivelIaEnum, TipoPromptEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { IaException } from '../../ia/domain/ia.exception';
import { RelatorioService } from './relatorio.service';

// SYSTEM.SPEC.md §14 ("Ver execuções de todos": só gestor) — o acesso é do controller (@GestorOnly); a service monta o
// relatório de UM projeto num período, sem filtro por usuário. Os repositories e a IA são dublês que registram o que receberam.

const FUSO = 'America/Sao_Paulo';

function linha(sobrescrita: Record<string, unknown> = {}) {
  return {
    nomeProjeto: 'Loja', nomeDemanda: 'Login', nomeAtividade: 'Formulário', nomeUsuario: 'Ana',
    dataExecucao: '2026-10-05', inicioData: new Date('2026-10-05T12:00:00Z'), fimData: new Date('2026-10-05T13:30:00Z'),
    duracaoMinutos: 90, descricao: 'Montou o formulário', statusAtividade: 'EM_ANDAMENTO',
    ...sobrescrita,
  };
}

const TEXTO_DO_PROMPT = 'Você é um auditor de teste';

interface Cenario {
  linhas?: ReturnType<typeof linha>[];
  projeto?: { id: number; nome: string; codigo: string } | null;
  respostaIa?: string | Error;
}

function criar(cenario: Cenario = {}) {
  const filtrosDasConsultas: Record<string, unknown>[] = [];
  const consultasAoProjeto: Record<string, unknown>[] = [];
  const chamadasIa: Record<string, unknown>[] = [];
  const pedidosDePrompt: string[] = [];
  const projeto = cenario.projeto === undefined ? { id: 3, nome: 'Loja', codigo: 'LOJA' } : cenario.projeto;
  const servico = Object.create(RelatorioService.prototype) as Record<string, unknown>;
  servico.execucaoRepositorio = {
    listarParaRelatorio: async (filtros: Record<string, unknown>) => { filtrosDasConsultas.push(filtros); return cenario.linhas ?? []; },
  };
  servico.projetoRepositorio = {
    recuperar: async (consulta: Record<string, unknown>) => { consultasAoProjeto.push(consulta); return projeto; },
  };
  servico.configService = { obter: () => ({ aplicacao: { fusoHorario: FUSO } }) };
  servico.promptService = {
    obterAtivo: async (tipo: string) => { pedidosDePrompt.push(tipo); return { conteudo: TEXTO_DO_PROMPT }; },
  };
  servico.iaService = {
    gerar: async (pedido: Record<string, unknown>) => {
      chamadasIa.push(pedido);
      if (cenario.respostaIa instanceof Error) throw cenario.respostaIa;
      return { texto: cenario.respostaIa ?? '{"resumo":"ok","inconsistencias":[]}' };
    },
  };
  return { servico: servico as unknown as RelatorioService, filtrosDasConsultas, consultasAoProjeto, chamadasIa, pedidosDePrompt };
}

const MENSAL = (ano: number, mes: number) => ({ projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano, mes });

// ── períodos ──────────────────────────────────────────────────────────────────────────────────────────────────────

test('anual: do dia 1º de janeiro a 31 de dezembro, com o ano na descrição', async () => {
  const { servico, filtrosDasConsultas } = criar();
  const resposta = await servico.gerarRelatorio({ projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: 2026 });
  assert.deepEqual(filtrosDasConsultas, [{ projetoId: 3, dataInicio: '2026-01-01', dataFim: '2026-12-31' }]);
  assert.equal(resposta.dados?.periodoDescricao, 'Ano 2026');
});

test('mensal: do dia 1º ao último dia do mês, inclusive fevereiro de ano bissexto e mês de 30 dias', async () => {
  const { servico, filtrosDasConsultas } = criar();
  await servico.gerarRelatorio(MENSAL(2028, 2));
  await servico.gerarRelatorio(MENSAL(2026, 2));
  await servico.gerarRelatorio(MENSAL(2026, 4));
  await servico.gerarRelatorio(MENSAL(2026, 12));
  assert.deepEqual(filtrosDasConsultas.map((filtro) => [filtro.dataInicio, filtro.dataFim]), [
    ['2028-02-01', '2028-02-29'], ['2026-02-01', '2026-02-28'], ['2026-04-01', '2026-04-30'], ['2026-12-01', '2026-12-31'],
  ]);
});

test('mensal: a descrição traz o nome do mês em português e o ano', async () => {
  const { servico } = criar();
  assert.equal((await servico.gerarRelatorio(MENSAL(2026, 3))).dados?.periodoDescricao, 'Março/2026');
  assert.equal((await servico.gerarRelatorio(MENSAL(2026, 10))).dados?.periodoDescricao, 'Outubro/2026');
});

test('personalizado: usa o intervalo informado, na descrição em dia/mês/ano, e aceita início igual ao fim', async () => {
  const { servico, filtrosDasConsultas } = criar();
  const resposta = await servico.gerarRelatorio({
    projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataInicio: '2026-09-05', dataFim: '2026-09-05',
  });
  assert.deepEqual(filtrosDasConsultas, [{ projetoId: 3, dataInicio: '2026-09-05', dataFim: '2026-09-05' }]);
  assert.equal(resposta.dados?.periodoDescricao, '05/09/2026 a 05/09/2026');
});

test('período sem os campos do tipo é recusado sem consultar nada', async () => {
  const { servico, filtrosDasConsultas, consultasAoProjeto } = criar();
  const recusas = [
    { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.ANUAL },
    { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2026 },
    { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, mes: 5 },
    { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataInicio: '2026-01-01' },
    { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataFim: '2026-01-01' },
    { projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM },
  ];
  for (const dto of recusas) await assert.rejects(() => servico.gerarRelatorio(dto), BusinessException);
  assert.equal(filtrosDasConsultas.length + consultasAoProjeto.length, 0);
});

test('personalizado: fim anterior ao início é recusado', async () => {
  const { servico, filtrosDasConsultas } = criar();
  await assert.rejects(
    () => servico.gerarRelatorio({ projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, dataInicio: '2026-09-10', dataFim: '2026-09-09' }),
    BusinessException,
  );
  assert.equal(filtrosDasConsultas.length, 0);
});

// ── filtro e totais ───────────────────────────────────────────────────────────────────────────────────────────────

test('projeto inexistente lança ResourceNotFoundException e não consulta execuções', async () => {
  const { servico, filtrosDasConsultas } = criar({ projeto: null });
  await assert.rejects(() => servico.gerarRelatorio(MENSAL(2026, 10)), ResourceNotFoundException);
  assert.equal(filtrosDasConsultas.length, 0);
});

test('o filtro é só por projeto e período: não há filtro por usuário (o relatório é do gestor)', async () => {
  const { servico, filtrosDasConsultas, consultasAoProjeto } = criar();
  await servico.gerarRelatorio(MENSAL(2026, 10));
  assert.deepEqual(consultasAoProjeto, [{ id: 3 }]);
  assert.deepEqual(Object.keys(filtrosDasConsultas[0]).sort(), ['dataFim', 'dataInicio', 'projetoId']);
});

test('devolve projeto, período, linhas e totais de execuções e de minutos', async () => {
  const linhas = [linha({ duracaoMinutos: 90 }), linha({ nomeUsuario: 'Bia', duracaoMinutos: 45 }), linha({ duracaoMinutos: 15 })];
  const { servico } = criar({ linhas });
  const relatorio = (await servico.gerarRelatorio(MENSAL(2026, 10))).dados!;
  assert.equal(relatorio.projetoId, 3);
  assert.equal(relatorio.nomeProjeto, 'Loja');
  assert.equal(relatorio.periodoTipo, RelatorioPeriodoTipoEnum.MENSAL);
  assert.equal(relatorio.totalExecucoes, 3);
  assert.equal(relatorio.totalMinutos, 150);
  assert.deepEqual(relatorio.linhas, linhas);
});

test('relatório sem execuções tem totais zerados', async () => {
  const { servico } = criar({ linhas: [] });
  const relatorio = (await servico.gerarRelatorio(MENSAL(2026, 10))).dados!;
  assert.equal(relatorio.totalExecucoes, 0);
  assert.equal(relatorio.totalMinutos, 0);
});

// ── download ──────────────────────────────────────────────────────────────────────────────────────────────────────

const BAIXAR_CSV = { ...MENSAL(2026, 10), formato: RelatorioFormatoEnum.CSV };
const quebrarCsv = (conteudo: Buffer) => conteudo.toString('utf-8').replace(/^﻿/, '').split('\r\n');
/** Data forçada a texto no Excel (`="..."`): no CSV as aspas saem duplicadas e o campo, entre aspas. */
const textoNaPlanilha = (valor: string) => `"=""${valor}"""`;
const mensagemDe = (erro: unknown) => ((erro as BusinessException).getResponse() as { mensagem: string }).mensagem;

test('CSV: tipo e nome do arquivo <código>-relatorio-<ano-mês>.csv (task 291)', async () => {
  const { servico } = criar({ linhas: [linha()] });
  const arquivo = await servico.baixarRelatorio(BAIXAR_CSV);
  assert.equal(arquivo.mimeType, 'text/csv; charset=utf-8');
  assert.equal(arquivo.nomeArquivo, 'loja-relatorio-2026-10.csv');
});

test('CSV: BOM UTF-8, cabeçalho na ordem das colunas, separador vírgula e quebra CRLF', async () => {
  const { servico } = criar({ linhas: [linha(), linha({ nomeUsuario: 'Bia' })] });
  const { conteudo } = await servico.baixarRelatorio(BAIXAR_CSV);
  assert.deepEqual([...conteudo.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
  const linhasDoArquivo = quebrarCsv(conteudo);
  assert.equal(linhasDoArquivo.length, 3);
  assert.equal(linhasDoArquivo[0], 'Projeto,Demanda,Atividade,Usuário,Data Início,Data Fim,Tempo (h),Descrição');
});

test('CSV: datas no fuso da aplicação, forçadas a texto, e duração em HH:MM', async () => {
  const { servico } = criar({ linhas: [linha()] });
  const colunas = quebrarCsv((await servico.baixarRelatorio(BAIXAR_CSV)).conteudo)[1].split(',');
  // 12:00Z e 13:30Z são 09:00 e 10:30 em São Paulo (UTC−3).
  assert.equal(colunas[4], textoNaPlanilha('05/10/2026 09:00'));
  assert.equal(colunas[5], textoNaPlanilha('05/10/2026 10:30'));
  assert.equal(colunas[6], '01:30');
});

test('CSV: execução em andamento sai com a data de fim vazia; datas que viram o dia mostram dia e hora completos', async () => {
  const { servico } = criar({
    linhas: [
      linha({ fimData: null, duracaoMinutos: 30 }),
      linha({ inicioData: new Date('2026-10-06T02:30:00Z'), fimData: new Date('2026-10-06T03:10:00Z'), duracaoMinutos: 40 }),
    ],
  });
  const [, andamento, viradaDeDia] = quebrarCsv((await servico.baixarRelatorio(BAIXAR_CSV)).conteudo).map((texto) => texto.split(','));
  assert.equal(andamento[5], '');
  // 02:30Z do dia 6 é 23:30 do dia 5 em São Paulo.
  assert.equal(viradaDeDia[4], textoNaPlanilha('05/10/2026 23:30'));
  assert.equal(viradaDeDia[5], textoNaPlanilha('06/10/2026 00:10'));
});

test('CSV: campos com vírgula, aspas ou quebra de linha são escapados', async () => {
  const { servico } = criar({ linhas: [linha({ nomeAtividade: 'Ajustar "login", tela', descricao: 'linha 1\nlinha 2' })] });
  const texto = (await servico.baixarRelatorio(BAIXAR_CSV)).conteudo.toString('utf-8');
  assert.ok(texto.includes('"Ajustar ""login"", tela"'));
  assert.ok(texto.includes('"linha 1\nlinha 2"'));
});

test('CSV: duração arredonda e nunca fica negativa', async () => {
  const { servico } = criar({ linhas: [linha({ duracaoMinutos: 59.6 }), linha({ duracaoMinutos: -5 }), linha({ duracaoMinutos: 125 })] });
  const duracoes = quebrarCsv((await servico.baixarRelatorio(BAIXAR_CSV)).conteudo).slice(1).map((texto) => texto.split(',')[6]);
  assert.deepEqual(duracoes, ['01:00', '00:00', '02:05']);
});

test('XLSX ainda não existe: recusa com BusinessException', async () => {
  const { servico } = criar({ linhas: [linha()] });
  await assert.rejects(() => servico.baixarRelatorio({ ...BAIXAR_CSV, formato: RelatorioFormatoEnum.XLSX }), BusinessException);
});

// ── revisão por IA ────────────────────────────────────────────────────────────────────────────────────────────────

const REVISAR = MENSAL(2026, 10);

test('revisão: chama a IA no nível padrão com o prompt ativo como instruções e só os dados na mensagem', async () => {
  const { servico, chamadasIa, pedidosDePrompt } = criar({ linhas: [linha()] });
  await servico.revisarRelatorio(REVISAR);
  assert.deepEqual(pedidosDePrompt, [TipoPromptEnum.REVISAO_RELATORIO]);
  assert.equal(chamadasIa.length, 1);
  assert.equal(chamadasIa[0].nivel, NivelIaEnum.PADRAO);
  assert.equal(chamadasIa[0].instrucoes, TEXTO_DO_PROMPT);
  const dados = (chamadasIa[0].mensagens as { papel: string; conteudo: string }[])[0].conteudo;
  assert.equal(dados.includes(TEXTO_DO_PROMPT), false);
  assert.ok(dados.includes('Projeto: Loja'));
  assert.ok(dados.includes('Período: Outubro/2026'));
  assert.ok(dados.includes('Total de execuções: 1'));
});

test('revisão: cada linha leva o início e o fim no fuso da aplicação, e "em andamento" quando não há fim', async () => {
  const { servico, chamadasIa } = criar({ linhas: [linha(), linha({ fimData: null })] });
  await servico.revisarRelatorio(REVISAR);
  const dados = (chamadasIa[0].mensagens as { conteudo: string }[])[0].conteudo;
  assert.match(dados, /1\. Login \/ Formulário — Ana — de \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} a \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} — 90 min/);
  assert.match(dados, /2\. .* a em andamento — 90 min/);
});

test('revisão: só as primeiras 200 linhas vão à IA, e o prompt avisa da amostra', async () => {
  const { servico, chamadasIa } = criar({ linhas: Array.from({ length: 205 }, () => linha()) });
  await servico.revisarRelatorio(REVISAR);
  const prompt = (chamadasIa[0].mensagens as { conteudo: string }[])[0].conteudo;
  assert.ok(prompt.includes('Linhas analisadas: 200 (amostra de 200 de 205 execuções'));
  assert.equal(prompt.includes('201. '), false);
});

test('revisão: devolve resumo e inconsistências lidos do JSON, mesmo com texto em volta e campos faltando', async () => {
  const { servico } = criar({
    linhas: [linha()],
    respostaIa: 'Segue a análise: {"resumo":"Duas falhas","inconsistencias":[{"tipo":"Descrição vaga","severidade":"ALTA","descricao":"Só diz ajustes","referencia":"1"},{"tipo":"Duração"}]} fim',
  });
  const revisao = (await servico.revisarRelatorio(REVISAR)).dados!;
  assert.equal(revisao.resumo, 'Duas falhas');
  assert.deepEqual(revisao.inconsistencias, [
    { tipo: 'Descrição vaga', severidade: 'ALTA', descricao: 'Só diz ajustes', referencia: '1' },
    { tipo: 'Duração', severidade: '', descricao: '', referencia: null },
  ]);
});

test('revisão: JSON sem lista de inconsistências vira lista vazia', async () => {
  const { servico } = criar({ linhas: [linha()], respostaIa: '{"resumo":"Tudo certo"}' });
  const revisao = (await servico.revisarRelatorio(REVISAR)).dados!;
  assert.deepEqual(revisao, { resumo: 'Tudo certo', inconsistencias: [] });
});

test('revisão: falha da IA vira BusinessException com a mensagem do motivo', async () => {
  const { servico } = criar({ linhas: [linha()], respostaIa: new IaException('DESLIGADA', 'A IA está desligada') });
  await assert.rejects(
    () => servico.revisarRelatorio(REVISAR),
    (erro: unknown) => erro instanceof BusinessException && mensagemDe(erro) === 'A IA está desligada',
  );
});

test('revisão: erro desconhecido e resposta sem JSON viram a mensagem genérica de indisponibilidade', async () => {
  for (const respostaIa of [new Error('socket'), 'sem json aqui', '{ quebrado']) {
    const { servico } = criar({ linhas: [linha()], respostaIa });
    await assert.rejects(
      () => servico.revisarRelatorio(REVISAR),
      (erro: unknown) => erro instanceof BusinessException && mensagemDe(erro) === 'Serviço de IA temporariamente indisponível',
    );
  }
});

test('revisão: período inválido ou projeto inexistente é recusado antes de chamar a IA', async () => {
  const semProjeto = criar({ projeto: null });
  await assert.rejects(() => semProjeto.servico.revisarRelatorio(REVISAR), ResourceNotFoundException);
  const semAno = criar();
  await assert.rejects(() => semAno.servico.revisarRelatorio({ projetoId: 3, periodoTipo: RelatorioPeriodoTipoEnum.ANUAL }), BusinessException);
  assert.equal(semProjeto.chamadasIa.length + semAno.chamadasIa.length, 0);
});
