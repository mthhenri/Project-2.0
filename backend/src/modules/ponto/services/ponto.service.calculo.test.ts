import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  TipoDiaNaoUtilDuracaoEnum, TipoDiaNaoUtilEnum, TipoUsuarioEnum,
} from '@project20/shared';
import { PontoService } from './ponto.service';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

// Cálculo do ponto (SYSTEM.SPEC.md §12 `ponto` e §14 "Intervalos" / "Dias Não Úteis"), sem banco: execuções, calendário,
// usuários e justificativas são dublês. Março de 2026: dia 2 é segunda-feira, 7 é sábado, 8 é domingo.
// A recorrência de feriado é SQL do calendário e fica em ponto.service.integracao.test.ts.

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const SEGUNDA = '2026-03-02';
const SABADO = '2026-03-07';

interface ExecucaoDublada { inicioData: Date; fimData: Date | null; duracaoMinutos: number | null }
type DiaNaoUtilDublado = { tipo: TipoDiaNaoUtilEnum | null; duracao: TipoDiaNaoUtilDuracaoEnum; descricao: string | null };

/** Execução de `data` entre as horas `inicio` e `fim` (formato `HH:MM`, fuso -03:00); sem `fim` fica aberta. */
function execucao(data: string, inicio: string, fim: string | null): ExecucaoDublada {
  const inicioData = new Date(`${data}T${inicio}:00-03:00`);
  const fimData = fim ? new Date(`${data}T${fim}:00-03:00`) : null;
  return { inicioData, fimData, duracaoMinutos: fimData ? Math.round((fimData.getTime() - inicioData.getTime()) / 60000) : null };
}

interface Cenario {
  usuarios?: Array<{ id: number; nomeCompleto: string; horasDiariasNecessarias: number }>;
  execucoes?: Record<number, ExecucaoDublada[]>;
  diasNaoUteis?: Record<string, DiaNaoUtilDublado>;
  justificativas?: Array<{ usuarioId: number; diaData: string; nome: string; horasCobertas: number }>;
}

function criarServico(cenario: Cenario = {}) {
  const usuarios = cenario.usuarios ?? [{ id: 3, nomeCompleto: 'Ana', horasDiariasNecessarias: 8 }];
  const consultas: string[] = [];
  const execucoesDoDia = (usuarioId: number, data: string) =>
    (cenario.execucoes?.[usuarioId] ?? []).filter((item) => item.inicioData.toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' }) === data);

  const servico = Object.create(PontoService.prototype) as Record<string, unknown>;
  servico.configService = { obter: () => ({ negocio: { intervaloMinimoMinutos: 15 } }) };
  servico.usuarioRepositorio = {
    recuperar: async ({ id }: { id: number }) => usuarios.find((usuario) => usuario.id === id) ?? null,
    listarAtivosComMeta: async () => usuarios,
  };
  servico.execucaoRepositorio = {
    listar: async (filtros: { data: string }, restricao: { usuarioId: number }) => {
      consultas.push(`listar ${restricao.usuarioId} ${filtros.data}`);
      return { itens: execucoesDoDia(restricao.usuarioId, filtros.data) };
    },
    agruparPorDia: async ({ usuarioId, dataInicio, dataFim }: { usuarioId: number; dataInicio: string; dataFim: string }) => {
      const porDia = new Map<string, ExecucaoDublada[]>();
      for (const item of cenario.execucoes?.[usuarioId] ?? []) {
        const dia = item.inicioData.toLocaleDateString('sv', { timeZone: 'America/Sao_Paulo' });
        if (dia >= dataInicio && dia <= dataFim) porDia.set(dia, [...(porDia.get(dia) ?? []), item]);
      }
      return [...porDia.entries()].sort().map(([dia, itens]) => ({
        dia,
        primeiroInicioData: itens[0].inicioData,
        ultimoFimData: itens[itens.length - 1].fimData,
        totalMinutosTrabalhados: itens.reduce((soma, item) => soma + (item.fimData ? item.duracaoMinutos! : 0), 0),
      }));
    },
  };
  servico.calendarioRepositorio = {
    recuperarTipo: async ({ data }: { data: Date }) => cenario.diasNaoUteis?.[data.toISOString().slice(0, 10)] ?? null,
    listarDiasNaoUteisDoMes: async ({ ano, mes }: { ano: number; mes: number }) =>
      Object.entries(cenario.diasNaoUteis ?? {})
        .filter(([data]) => data.startsWith(`${ano}-${String(mes).padStart(2, '0')}`))
        .map(([data, info]) => ({ dia: Number(data.slice(8, 10)), ...info })),
  };
  servico.pontoJustificativaRepositorio = {
    recuperarPorUsuarioEDia: async ({ usuarioId, diaData }: { usuarioId: number; diaData: string }) =>
      cenario.justificativas?.find((item) => item.usuarioId === usuarioId && item.diaData === diaData) ?? null,
    listarPorUsuarioEMes: async ({ usuarioId, ano, mes }: { usuarioId: number; ano: number; mes: number }) =>
      (cenario.justificativas ?? []).filter((item) => item.usuarioId === usuarioId && item.diaData.startsWith(`${ano}-${String(mes).padStart(2, '0')}`)),
  };
  return { servico: servico as unknown as PontoService, consultas };
}

const MEIO_PERIODO: DiaNaoUtilDublado = { tipo: TipoDiaNaoUtilEnum.PONTO_FACULTATIVO, duracao: TipoDiaNaoUtilDuracaoEnum.MEIO_PERIODO, descricao: 'Jogo do Brasil' };
const FERIADO_INTEGRAL: DiaNaoUtilDublado = { tipo: TipoDiaNaoUtilEnum.FERIADO, duracao: TipoDiaNaoUtilDuracaoEnum.INTEGRAL, descricao: 'Dia do Trabalho' };

// ---------------------------------------------------------------------------
// Ponto diário
// ---------------------------------------------------------------------------

test('diário: dia útil (fração 1) soma só execuções encerradas, compara com a meta e não gera extra', async () => {
  const { servico } = criarServico({ execucoes: { 3: [
    execucao(SEGUNDA, '09:00', '12:00'), execucao(SEGUNDA, '13:00', '18:00'), execucao(SEGUNDA, '18:10', null),
  ] } });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.ehDiaUtil, true);
  assert.equal(ponto.motivoNaoUtil, null);
  assert.equal(ponto.metaMinutos, 480);
  assert.equal(ponto.totalMinutosTrabalhados, 480);
  assert.equal(ponto.minutosTrabalhadosDiaUtil, 480);
  assert.equal(ponto.minutosTrabalhadosExtra, 0);
  assert.equal(ponto.saldoMinutos, 0);
  assert.equal(ponto.execucoes.length, 3);
});

test('diário: a meta vem das horas diárias do usuário e o saldo do dia útil pode ser positivo ou negativo', async () => {
  const seisHoras = { id: 3, nomeCompleto: 'Ana', horasDiariasNecessarias: 6 };
  const mais = criarServico({ usuarios: [seisHoras], execucoes: { 3: [execucao(SEGUNDA, '08:00', '15:00')] } });
  const sobra = await mais.servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(sobra.metaMinutos, 360);
  assert.equal(sobra.saldoMinutos, 60);

  const menos = criarServico({ usuarios: [seisHoras], execucoes: { 3: [execucao(SEGUNDA, '08:00', '10:00')] } });
  assert.equal((await menos.servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR)).saldoMinutos, -240);
});

test('diário, meio período (fração 0.5): meta pela metade e o excedente vira hora extra', async () => {
  const { servico } = criarServico({
    diasNaoUteis: { [SEGUNDA]: MEIO_PERIODO },
    execucoes: { 3: [execucao(SEGUNDA, '08:00', '13:00')] },
  });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.ehDiaUtil, false);
  assert.equal(ponto.motivoNaoUtil, 'Ponto facultativo - Jogo do Brasil (meio período)');
  assert.equal(ponto.metaMinutos, 240);
  assert.equal(ponto.totalMinutosTrabalhados, 300);
  assert.equal(ponto.minutosTrabalhadosDiaUtil, 240);
  assert.equal(ponto.minutosTrabalhadosExtra, 60);
  assert.equal(ponto.saldoMinutos, 0);
});

test('diário, meio período: o saldo do dia nunca fica positivo, por mais que se trabalhe', async () => {
  const { servico } = criarServico({
    diasNaoUteis: { [SEGUNDA]: MEIO_PERIODO },
    execucoes: { 3: [execucao(SEGUNDA, '07:00', '19:00')] },
  });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.saldoMinutos, 0);
  assert.equal(ponto.minutosTrabalhadosExtra, 720 - 240);
});

test('diário, meio período: trabalhar menos que a meta pela metade deixa saldo negativo e nada de extra', async () => {
  const { servico } = criarServico({
    diasNaoUteis: { [SEGUNDA]: MEIO_PERIODO },
    execucoes: { 3: [execucao(SEGUNDA, '08:00', '10:00')] },
  });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.saldoMinutos, -120);
  assert.equal(ponto.minutosTrabalhadosExtra, 0);
});

test('diário: trabalho no fim de semana é hora extra, nunca "dia útil"', async () => {
  const { servico } = criarServico({ execucoes: { 3: [execucao(SABADO, '09:00', '12:00')] } });
  const ponto = await servico.consultarDiario({ data: SABADO }, DESENVOLVEDOR);
  assert.equal(ponto.ehDiaUtil, false);
  assert.equal(ponto.motivoNaoUtil, 'Fim de semana');
  assert.equal(ponto.minutosTrabalhadosDiaUtil, 0);
  assert.equal(ponto.minutosTrabalhadosExtra, 180);
  assert.equal(ponto.totalMinutosTrabalhados, 180);
});

test('diário: fim de semana e dia não útil integral têm fração 0 e não exigem meta (§14: não contam na meta)', { todo: 'P-015' }, async () => {
  const sabado = await criarServico().servico.consultarDiario({ data: SABADO }, DESENVOLVEDOR);
  assert.equal(sabado.metaMinutos, 0);
  assert.equal(sabado.saldoMinutos, 0);

  const feriado = await criarServico({ diasNaoUteis: { [SEGUNDA]: FERIADO_INTEGRAL } }).servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(feriado.metaMinutos, 0);
  assert.equal(feriado.saldoMinutos, 0);
});

test('diário: dia não útil integral informa o motivo "<tipo> - <descrição>" e conta o trabalho como extra', async () => {
  const { servico } = criarServico({
    diasNaoUteis: { [SEGUNDA]: FERIADO_INTEGRAL },
    execucoes: { 3: [execucao(SEGUNDA, '10:00', '11:00')] },
  });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.ehDiaUtil, false);
  assert.equal(ponto.motivoNaoUtil, 'Feriado - Dia do Trabalho');
  assert.equal(ponto.minutosTrabalhadosExtra, 60);
});

test('diário, intervalos: gap menor que o mínimo não conta, igual ao mínimo conta, e pode haver vários no dia', async () => {
  const { servico } = criarServico({ execucoes: { 3: [
    execucao(SEGUNDA, '09:00', '10:00'),
    execucao(SEGUNDA, '10:14', '11:00'), // gap de 14 min: abaixo do mínimo (15)
    execucao(SEGUNDA, '11:15', '12:00'), // gap de 15 min: igual ao mínimo, conta
    execucao(SEGUNDA, '13:30', '15:00'), // gap de 90 min
  ] } });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.deepEqual(ponto.intervalos.map((intervalo) => intervalo.duracaoMinutos), [15, 90]);
});

test('diário, intervalos: as execuções são ordenadas por início antes de achar os gaps', async () => {
  const { servico } = criarServico({ execucoes: { 3: [
    execucao(SEGUNDA, '14:00', '15:00'), execucao(SEGUNDA, '09:00', '10:00'),
  ] } });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.deepEqual(ponto.intervalos.map((intervalo) => intervalo.duracaoMinutos), [240]);
  assert.equal(ponto.execucoes[0].inicioData.getTime(), execucao(SEGUNDA, '09:00', null).inicioData.getTime());
});

test('diário, intervalos: execução aberta não entra no total nem forma intervalo', async () => {
  const { servico } = criarServico({ execucoes: { 3: [execucao(SEGUNDA, '09:00', '10:00'), execucao(SEGUNDA, '12:00', null)] } });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.totalMinutosTrabalhados, 60);
  assert.deepEqual(ponto.intervalos, []);
});

test('diário: justificativa desconta da meta do dia útil (task 82) e o saldo acompanha', async () => {
  const { servico } = criarServico({
    execucoes: { 3: [execucao(SEGUNDA, '09:00', '13:00')] },
    justificativas: [{ usuarioId: 3, diaData: SEGUNDA, nome: 'Consulta', horasCobertas: 4 }],
  });
  const ponto = await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.metaMinutos, 240);
  assert.equal(ponto.saldoMinutos, 0);
});

test('diário: a justificativa nunca deixa a meta negativa e, no meio período, desconta da meta já reduzida', async () => {
  const dia = criarServico({
    justificativas: [{ usuarioId: 3, diaData: SEGUNDA, nome: 'Atestado', horasCobertas: 8 }],
  });
  assert.equal((await dia.servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR)).metaMinutos, 0);

  const meio = criarServico({
    diasNaoUteis: { [SEGUNDA]: MEIO_PERIODO },
    execucoes: { 3: [execucao(SEGUNDA, '08:00', '09:00')] },
    justificativas: [{ usuarioId: 3, diaData: SEGUNDA, nome: 'Consulta', horasCobertas: 1 }],
  });
  const ponto = await meio.servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR);
  assert.equal(ponto.metaMinutos, 180);
  assert.equal(ponto.saldoMinutos, -120);
});

test('diário: justificativa de outro dia ou de outro usuário não desconta', async () => {
  const { servico } = criarServico({
    justificativas: [
      { usuarioId: 3, diaData: '2026-03-03', nome: 'Outro dia', horasCobertas: 4 },
      { usuarioId: 9, diaData: SEGUNDA, nome: 'Outro usuário', horasCobertas: 4 },
    ],
  });
  assert.equal((await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR)).metaMinutos, 480);
});

// ---------------------------------------------------------------------------
// Permissão
// ---------------------------------------------------------------------------

test('desenvolvedor só consulta o próprio ponto, diário e mensal; sem usuarioId é o próprio', async () => {
  const { servico, consultas } = criarServico({ usuarios: [
    { id: 3, nomeCompleto: 'Ana', horasDiariasNecessarias: 8 }, { id: 4, nomeCompleto: 'Beto', horasDiariasNecessarias: 8 },
  ] });
  await assert.rejects(() => servico.consultarDiario({ data: SEGUNDA, usuarioId: 4 }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(() => servico.consultarMensal({ ano: 2026, mes: 3, usuarioId: 4 }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(consultas, []);
  assert.equal((await servico.consultarDiario({ data: SEGUNDA }, DESENVOLVEDOR)).usuarioId, 3);
  assert.equal((await servico.consultarDiario({ data: SEGUNDA, usuarioId: 3 }, DESENVOLVEDOR)).usuarioId, 3);
  assert.equal((await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR)).usuarioId, 3);
});

test('gestor consulta o ponto de qualquer usuário, diário e mensal', async () => {
  const { servico } = criarServico({ usuarios: [{ id: 4, nomeCompleto: 'Beto', horasDiariasNecessarias: 8 }] });
  assert.equal((await servico.consultarDiario({ data: SEGUNDA, usuarioId: 4 }, GESTOR)).nomeUsuario, 'Beto');
  assert.equal((await servico.consultarMensal({ ano: 2026, mes: 3, usuarioId: 4 }, GESTOR)).nomeUsuario, 'Beto');
});

test('usuário inexistente: ResourceNotFoundException no diário e no mensal', async () => {
  const { servico } = criarServico();
  await assert.rejects(() => servico.consultarDiario({ data: SEGUNDA, usuarioId: 99 }, GESTOR), ResourceNotFoundException);
  await assert.rejects(() => servico.consultarMensal({ ano: 2026, mes: 3, usuarioId: 99 }, GESTOR), ResourceNotFoundException);
});

// ---------------------------------------------------------------------------
// "Todos hoje"
// ---------------------------------------------------------------------------

test('todos: um ponto por usuário ativo, cada um com as próprias execuções, justificativa e meta', async () => {
  const { servico } = criarServico({
    usuarios: [
      { id: 3, nomeCompleto: 'Ana', horasDiariasNecessarias: 8 },
      { id: 4, nomeCompleto: 'Beto', horasDiariasNecessarias: 6 },
    ],
    execucoes: { 3: [execucao(SEGUNDA, '09:00', '12:00')], 4: [execucao(SEGUNDA, '09:00', '10:00')] },
    justificativas: [{ usuarioId: 4, diaData: SEGUNDA, nome: 'Consulta', horasCobertas: 2 }],
  });
  const pontos = await servico.consultarTodos({ data: SEGUNDA }, GESTOR);
  assert.deepEqual(pontos.map((ponto) => [ponto.nomeUsuario, ponto.metaMinutos, ponto.totalMinutosTrabalhados]), [
    ['Ana', 480, 180], ['Beto', 240, 60],
  ]);
});

test('todos: o dia não útil vale para todos os usuários', async () => {
  const { servico } = criarServico({
    usuarios: [{ id: 3, nomeCompleto: 'Ana', horasDiariasNecessarias: 8 }, { id: 4, nomeCompleto: 'Beto', horasDiariasNecessarias: 8 }],
    diasNaoUteis: { [SEGUNDA]: MEIO_PERIODO },
  });
  const pontos = await servico.consultarTodos({ data: SEGUNDA }, GESTOR);
  assert.deepEqual(pontos.map((ponto) => ponto.metaMinutos), [240, 240]);
});

test('todos: sem usuários ativos devolve lista vazia', async () => {
  const { servico } = criarServico({ usuarios: [] });
  assert.deepEqual(await servico.consultarTodos({ data: SEGUNDA }, GESTOR), []);
});

// ---------------------------------------------------------------------------
// Ponto mensal
// ---------------------------------------------------------------------------

test('mensal: devolve um item por dia do mês, fevereiro de ano comum com 28 e bissexto com 29', async () => {
  const { servico } = criarServico();
  assert.equal((await servico.consultarMensal({ ano: 2026, mes: 2 }, DESENVOLVEDOR)).dias.length, 28);
  assert.equal((await servico.consultarMensal({ ano: 2028, mes: 2 }, DESENVOLVEDOR)).dias.length, 29);
});

test('mensal: a meta do mês é a soma das frações de dia vezes a jornada; fim de semana não entra', async () => {
  const { servico } = criarServico();
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  assert.equal(mensal.diasUteisMes, 22);
  assert.equal(mensal.metaMinutosMes, 22 * 480);
  const sabado = mensal.dias.find((dia) => dia.data === SABADO)!;
  assert.equal(sabado.ehDiaUtil, false);
  assert.equal(sabado.motivoNaoUtil, 'Fim de semana');
  assert.equal(sabado.metaMinutos, 0);
});

test('mensal: dia não útil integral zera a meta do dia e meio período conta 0,5', async () => {
  const { servico } = criarServico({ diasNaoUteis: { '2026-03-03': FERIADO_INTEGRAL, '2026-03-04': MEIO_PERIODO } });
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  assert.equal(mensal.diasUteisMes, 22 - 1 - 0.5);
  assert.equal(mensal.metaMinutosMes, (22 - 1.5) * 480);
  const integral = mensal.dias.find((dia) => dia.data === '2026-03-03')!;
  const meio = mensal.dias.find((dia) => dia.data === '2026-03-04')!;
  assert.deepEqual([integral.ehDiaUtil, integral.metaMinutos, integral.motivoNaoUtil], [false, 0, 'Feriado - Dia do Trabalho']);
  assert.deepEqual([meio.ehDiaUtil, meio.metaMinutos, meio.motivoNaoUtil], [false, 240, 'Ponto facultativo - Jogo do Brasil (meio período)']);
});

test('mensal: dia não útil cadastrado num sábado não muda o motivo "Fim de semana" nem a meta', async () => {
  const { servico } = criarServico({ diasNaoUteis: { [SABADO]: FERIADO_INTEGRAL } });
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  assert.equal(mensal.dias.find((dia) => dia.data === SABADO)!.motivoNaoUtil, 'Fim de semana');
  assert.equal(mensal.diasUteisMes, 22);
});

test('mensal: soma as horas dos dias, compara com a meta e o saldo do mês é a diferença', async () => {
  const { servico } = criarServico({ execucoes: { 3: [
    execucao(SEGUNDA, '09:00', '18:00'),     // 540
    execucao('2026-03-03', '09:00', '13:00'), // 240
    execucao(SABADO, '09:00', '11:00'),       // 120 de fim de semana: soma no total, não na meta
  ] } });
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  assert.equal(mensal.totalMinutosTrabalhadosMes, 900);
  assert.equal(mensal.metaMinutosMes, 22 * 480);
  assert.equal(mensal.saldoMinutosMes, 900 - 22 * 480);
  const segunda = mensal.dias.find((dia) => dia.data === SEGUNDA)!;
  assert.deepEqual([segunda.totalMinutosTrabalhados, segunda.saldoMinutos], [540, 60]);
  assert.equal(mensal.dias.find((dia) => dia.data === SABADO)!.saldoMinutos, 120);
});

test('mensal: no meio período o saldo do dia nunca é positivo', async () => {
  const { servico } = criarServico({
    diasNaoUteis: { [SEGUNDA]: MEIO_PERIODO },
    execucoes: { 3: [execucao(SEGUNDA, '07:00', '19:00')] },
  });
  const dia = (await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR)).dias.find((item) => item.data === SEGUNDA)!;
  assert.equal(dia.saldoMinutos, 0);
  assert.equal(dia.totalMinutosTrabalhados, 720);
});

test('mensal: a justificativa desconta da meta do dia e do mês, e o dia informa nome e minutos cobertos (task 82)', async () => {
  const { servico } = criarServico({
    execucoes: { 3: [execucao(SEGUNDA, '09:00', '13:00')] },
    justificativas: [{ usuarioId: 3, diaData: SEGUNDA, nome: 'Consulta médica', horasCobertas: 4 }],
  });
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  const dia = mensal.dias.find((item) => item.data === SEGUNDA)!;
  assert.equal(dia.metaMinutos, 240);
  assert.equal(dia.saldoMinutos, 0);
  assert.equal(dia.justificativaNome, 'Consulta médica');
  assert.equal(dia.justificativaMinutosCobertos, 240);
  assert.equal(mensal.metaMinutosMes, 22 * 480 - 240);
  assert.equal(mensal.dias.find((item) => item.data === '2026-03-03')!.justificativaNome, null);
});

test('mensal: justificativa que cobre a jornada inteira zera a meta do dia sem deixá-la negativa', async () => {
  const { servico } = criarServico({ justificativas: [{ usuarioId: 3, diaData: SEGUNDA, nome: 'Atestado', horasCobertas: 8 }] });
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  assert.equal(mensal.dias.find((dia) => dia.data === SEGUNDA)!.metaMinutos, 0);
  assert.equal(mensal.metaMinutosMes, 21 * 480);
});

test('mensal: só os dias com execução trazem intervalos, calculados pelo mesmo mínimo do diário', async () => {
  const { servico } = criarServico({ execucoes: { 3: [
    execucao(SEGUNDA, '09:00', '12:00'), execucao(SEGUNDA, '13:00', '17:00'),
  ] } });
  const mensal = await servico.consultarMensal({ ano: 2026, mes: 3 }, DESENVOLVEDOR);
  assert.deepEqual(mensal.dias.find((dia) => dia.data === SEGUNDA)!.intervalos.map((intervalo) => intervalo.duracaoMinutos), [60]);
  assert.deepEqual(mensal.dias.find((dia) => dia.data === '2026-03-03')!.intervalos, []);
});

test('mensal: o ponto de um usuário não soma execuções de outro', async () => {
  const { servico } = criarServico({
    usuarios: [{ id: 3, nomeCompleto: 'Ana', horasDiariasNecessarias: 8 }, { id: 4, nomeCompleto: 'Beto', horasDiariasNecessarias: 8 }],
    execucoes: { 3: [execucao(SEGUNDA, '09:00', '10:00')], 4: [execucao(SEGUNDA, '09:00', '17:00')] },
  });
  assert.equal((await servico.consultarMensal({ ano: 2026, mes: 3, usuarioId: 3 }, GESTOR)).totalMinutosTrabalhadosMes, 60);
});
