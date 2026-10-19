import * as assert from 'node:assert/strict';
import { testarComBanco, ConexaoTeste } from '../../../testes/banco-teste';
import { criarRepositorio } from '../../../testes/criar-repositorio';
import { criarDiaNaoUtil, excluirLinha } from '../../../testes/fabricas';
import { dataDoBancoComoTexto } from '../../../core/utils/data-do-banco';
import { CalendarioRepository } from './calendario.repository';

// Dias não úteis no SQL real: `is_deleted = false` em toda leitura, casamento por data exata e por mês/dia dos recorrentes,
// duração independente do tipo, soft delete e restauração. As migrations semeiam feriados nacionais recorrentes; os testes
// usam março (sem feriado semeado) e filtram pela descrição para não depender deles. O banco não tem índice único de data:
// duas linhas na mesma data convivem (documentado no teste de `inserir`).

const repositorioDe = (conexao: ConexaoTeste) => criarRepositorio(CalendarioRepository, conexao);
/** Instante em meia-noite UTC, como o calendário envia (`validarDia` extrai o dia com `AT TIME ZONE 'UTC'`). */
const utc = (data: string) => new Date(`${data}T00:00:00Z`);

testarComBanco('inserir: grava ativo e devolve tipo e duração como código, com a data como texto', async (conexao) => {
  const criado = await repositorioDe(conexao).inserir({
    diaData: '2026-03-10', descricao: 'Dia de teste', tipo: 'RECESSO' as never, duracao: 'MEIO_PERIODO' as never, recorrente: true,
  });
  assert.equal(criado.tipo, 'RECESSO');
  assert.equal(criado.duracao, 'MEIO_PERIODO');
  assert.equal(criado.recorrente, true);
  const recuperado = await repositorioDe(conexao).recuperar({ id: criado.id });
  assert.equal(recuperado?.descricao, 'Dia de teste');
});

testarComBanco('inserir: tipo e duração são independentes (feriado de meio período, recesso integral)', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const meio = await repositorio.inserir({ diaData: '2026-03-10', descricao: 'A', tipo: 'FERIADO' as never, duracao: 'MEIO_PERIODO' as never, recorrente: false });
  const integral = await repositorio.inserir({ diaData: '2026-03-11', descricao: 'B', tipo: 'RECESSO' as never, duracao: 'INTEGRAL' as never, recorrente: false });
  assert.deepEqual([meio.tipo, meio.duracao], ['FERIADO', 'MEIO_PERIODO']);
  assert.deepEqual([integral.tipo, integral.duracao], ['RECESSO', 'INTEGRAL']);
});

testarComBanco('inserir: não há unicidade de data — recorrente e pontual na mesma data convivem', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  await repositorio.inserir({ diaData: '2026-03-10', descricao: 'Fixo', tipo: 'FERIADO' as never, duracao: 'INTEGRAL' as never, recorrente: true });
  await repositorio.inserir({ diaData: '2026-03-10', descricao: 'Único', tipo: 'RECESSO' as never, duracao: 'INTEGRAL' as never, recorrente: false });
  const naData = (await repositorio.listar()).filter((dia) => String(dia.diaData).startsWith('2026-03-10') || dia.descricao === 'Fixo' || dia.descricao === 'Único');
  assert.equal(naData.length, 2);
});

testarComBanco('listar: só os ativos, em ordem de data', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  await criarDiaNaoUtil(conexao, { diaData: '2026-03-20', descricao: 'Zz tarde' });
  await criarDiaNaoUtil(conexao, { diaData: '2026-03-02', descricao: 'Zz cedo' });
  const excluido = await criarDiaNaoUtil(conexao, { diaData: '2026-03-12', descricao: 'Zz excluído' });
  await excluirLinha(conexao, 'dia_nao_util', excluido.id);

  const descricoes = (await repositorio.listar()).map((dia) => dia.descricao).filter((descricao) => descricao.startsWith('Zz '));
  assert.deepEqual(descricoes, ['Zz cedo', 'Zz tarde']);
});

testarComBanco('recuperar: devolve o ativo e nulo para inexistente ou excluído', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const dia = await criarDiaNaoUtil(conexao, { descricao: 'Recuperável' });
  assert.equal((await repositorio.recuperar({ id: dia.id }))?.descricao, 'Recuperável');
  assert.equal(await repositorio.recuperar({ id: 2_000_000_000 }), null);
  await excluirLinha(conexao, 'dia_nao_util', dia.id);
  assert.equal(await repositorio.recuperar({ id: dia.id }), null);
});

testarComBanco('alterar: muda só os campos informados e preserva a data', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const dia = await criarDiaNaoUtil(conexao, { diaData: '2026-03-10', descricao: 'Original', tipoCodigo: 'FERIADO', duracaoCodigo: 'INTEGRAL', recorrente: false });
  const alterado = await repositorio.alterar({ id: dia.id, duracao: 'MEIO_PERIODO' as never, recorrente: true });
  assert.equal(alterado.descricao, 'Original');
  assert.equal(alterado.tipo, 'FERIADO');
  assert.equal(alterado.duracao, 'MEIO_PERIODO');
  assert.equal(alterado.recorrente, true);
  assert.equal(dataDoBancoComoTexto(alterado.diaData as never), '2026-03-10');
});

testarComBanco('alterar não toca dia excluído', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const dia = await criarDiaNaoUtil(conexao, { descricao: 'Antes' });
  await excluirLinha(conexao, 'dia_nao_util', dia.id);
  const resultado = await repositorio.alterar({ id: dia.id, descricao: 'Depois' });
  assert.equal(resultado, undefined);
  const { rows } = await conexao.raw('SELECT descricao FROM dia_nao_util WHERE dia_nao_util.id = :id', { id: dia.id });
  assert.equal(rows[0].descricao, 'Antes');
});

testarComBanco('excluir faz soft delete: grava is_deleted e deleted_date, sem remover a linha', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const dia = await criarDiaNaoUtil(conexao);
  await repositorio.excluir({ id: dia.id });
  assert.equal(await repositorio.recuperar({ id: dia.id }), null);
  const { rows } = await conexao.raw('SELECT is_deleted, deleted_date FROM dia_nao_util WHERE dia_nao_util.id = :id', { id: dia.id });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].is_deleted, true);
  assert.ok(rows[0].deleted_date instanceof Date);
});

testarComBanco('recuperarExcluido enxerga só o excluído; restaurar o reativa sem duplicar', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const dia = await criarDiaNaoUtil(conexao, { descricao: 'Volta' });
  assert.equal(await repositorio.recuperarExcluido({ id: dia.id }), null);

  await repositorio.excluir({ id: dia.id });
  assert.equal((await repositorio.recuperarExcluido({ id: dia.id }))?.descricao, 'Volta');

  const restaurado = await repositorio.restaurar({ id: dia.id });
  assert.equal(restaurado.descricao, 'Volta');
  assert.equal((await repositorio.recuperar({ id: dia.id }))?.descricao, 'Volta');
  assert.equal(await repositorio.recuperarExcluido({ id: dia.id }), null);
  const { rows } = await conexao.raw('SELECT is_deleted, deleted_date FROM dia_nao_util WHERE dia_nao_util.id = :id', { id: dia.id });
  assert.equal(rows[0].is_deleted, false);
  assert.equal(rows[0].deleted_date, null);
});

testarComBanco('validarDia: o pontual vale só na própria data', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  await criarDiaNaoUtil(conexao, { diaData: '2026-03-10', recorrente: false });
  assert.equal(await repositorio.validarDia({ data: utc('2026-03-10') }), true);
  assert.equal(await repositorio.validarDia({ data: utc('2026-03-11') }), false);
  assert.equal(await repositorio.validarDia({ data: utc('2027-03-10') }), false);
});

testarComBanco('validarDia: o recorrente vale no mesmo mês e dia de qualquer ano, e excluído não conta', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  const dia = await criarDiaNaoUtil(conexao, { diaData: '2020-03-17', recorrente: true });
  assert.equal(await repositorio.validarDia({ data: utc('2026-03-17') }), true);
  assert.equal(await repositorio.validarDia({ data: utc('2031-03-17') }), true);
  assert.equal(await repositorio.validarDia({ data: utc('2026-03-18') }), false);
  await excluirLinha(conexao, 'dia_nao_util', dia.id);
  assert.equal(await repositorio.validarDia({ data: utc('2026-03-17') }), false);
});

testarComBanco('recuperarTipo: devolve tipo, duração e descrição da data, e nulo em dia útil', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  await criarDiaNaoUtil(conexao, { diaData: '2020-03-17', recorrente: true, tipoCodigo: 'PONTO_FACULTATIVO', duracaoCodigo: 'MEIO_PERIODO', descricao: 'Facultativo' });
  const info = await repositorio.recuperarTipo({ data: utc('2026-03-17') });
  assert.deepEqual(info, { tipo: 'PONTO_FACULTATIVO', duracao: 'MEIO_PERIODO', descricao: 'Facultativo' });
  assert.equal(await repositorio.recuperarTipo({ data: utc('2026-03-16') }), null);
});

testarComBanco('listarDiasNaoUteisDoMes: recorrentes do mês de qualquer ano e pontuais só do ano e mês pedidos', async (conexao) => {
  const repositorio = repositorioDe(conexao);
  await criarDiaNaoUtil(conexao, { diaData: '2020-03-17', recorrente: true, descricao: 'Mes fixo' });
  await criarDiaNaoUtil(conexao, { diaData: '2026-03-05', recorrente: false, descricao: 'Mes único' });
  await criarDiaNaoUtil(conexao, { diaData: '2025-03-06', recorrente: false, descricao: 'Mes outro ano' });
  await criarDiaNaoUtil(conexao, { diaData: '2026-04-05', recorrente: false, descricao: 'Mes outro mês' });
  const excluido = await criarDiaNaoUtil(conexao, { diaData: '2026-03-25', recorrente: false, descricao: 'Mes excluído' });
  await excluirLinha(conexao, 'dia_nao_util', excluido.id);

  const dias = (await repositorio.listarDiasNaoUteisDoMes({ ano: 2026, mes: 3 })).filter((dia) => dia.descricao.startsWith('Mes '));
  assert.deepEqual(dias.map((dia) => [dia.dia, dia.descricao]), [[5, 'Mes único'], [17, 'Mes fixo']]);
});

testarComBanco('listarDiasNaoUteisDoMes: devolve tipo e duração para o ponto descontar a meta', async (conexao) => {
  await criarDiaNaoUtil(conexao, { diaData: '2026-03-09', descricao: 'Mes meia', tipoCodigo: 'RECESSO', duracaoCodigo: 'MEIO_PERIODO' });
  const [dia] = (await repositorioDe(conexao).listarDiasNaoUteisDoMes({ ano: 2026, mes: 3 })).filter((item) => item.descricao === 'Mes meia');
  assert.equal(dia.tipo, 'RECESSO');
  assert.equal(dia.duracao, 'MEIO_PERIODO');
});
