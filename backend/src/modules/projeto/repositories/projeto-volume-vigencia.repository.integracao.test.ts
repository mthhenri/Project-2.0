import * as assert from 'node:assert/strict';
import { testarComBanco } from '../../../testes/banco-teste';
import { criarProjeto } from '../../../testes/fabricas';
import { ProjetoRepository } from './projeto.repository';
import { ProjetoVolumeVigenciaRepository } from './projeto-volume-vigencia.repository';
import { ProjetoVolumeVigenciaService } from '../services/projeto-volume-vigencia.service';
import { SqlMigrationSource } from '../../../database/sql-migration-source';
import * as path from 'node:path';

testarComBanco('migration 0068 aplica, reverte com valor mais recente e reaplica preservando zero e projetos sem início', async conexao => {
  const migration = await new SqlMigrationSource(path.resolve(__dirname, '../../../database/migrations')).getMigration('0068 - Volume esperado do projeto por vigencia.sql');
  await migration.down(conexao);
  const projeto = await criarProjeto(conexao, { inicioData: '2026-01-17' });
  const semInicio = await criarProjeto(conexao, { dataBase: '2025-03-17T12:00:00-03:00' });
  await conexao.raw('UPDATE projeto SET volume_esperado_horas_mes = :horas WHERE id = :id', { id: projeto.id, horas: 160 });
  await conexao.raw('UPDATE projeto SET volume_esperado_horas_mes = :horas WHERE id = :id', { id: semInicio.id, horas: 0 });
  await migration.up(conexao);
  const repositorio = new ProjetoVolumeVigenciaRepository(conexao);
  assert.equal((await repositorio.listar({ projetoId: projeto.id }))[0].vigenciaInicioData, '2026-01-01');
  assert.deepEqual((await repositorio.listar({ projetoId: semInicio.id })).map(vigencia => [vigencia.vigenciaInicioData, vigencia.volumeEsperadoHoras]), [['2025-03-01', 0]]);
  await repositorio.inserir({ projetoId: projeto.id, vigenciaInicioData: '2026-04-01', volumeEsperadoHoras: 120 });
  await migration.down(conexao);
  const legado = await conexao.raw('SELECT volume_esperado_horas_mes FROM projeto WHERE id = :id AND is_deleted = false', { id: projeto.id });
  assert.equal(legado.rows[0].volume_esperado_horas_mes, 120);
  await migration.up(conexao);
  assert.equal((await repositorio.listar({ projetoId: projeto.id }))[0].volumeEsperadoHoras, 120);
});

testarComBanco('vigência: dois valores, mês anterior, zero, null, substituição e exclusão', async conexao => {
  const projeto = await criarProjeto(conexao);
  const repositorio = new ProjetoVolumeVigenciaRepository(conexao);
  const projetoRepositorio = new ProjetoRepository(conexao);
  const servico = new ProjetoVolumeVigenciaService(repositorio, projetoRepositorio);
  const registrar = (vigenciaInicioData: string, volumeEsperadoHoras: number | null) => servico.criar({ projetoId: projeto.id, vigenciaInicioData, volumeEsperadoHoras });
  const consultar = async () => (await projetoRepositorio.listarVolumePorMes({ dataInicio: '2026-01-01', dataFim: '2026-12-31' }))
    .filter(linha => linha.projetoId === projeto.id).map(linha => linha.volumeEsperadoHorasMes);
  await registrar('2026-02-17', 160);
  const abril = await registrar('2026-04-17', 120);
  assert.equal(abril.vigenciaInicioData, '2026-04-01');
  assert.deepEqual((await consultar()).slice(0, 5), [null, 160, 160, 120, 120]);
  const substituta = await registrar('2026-04-20', 80);
  assert.equal((await repositorio.listar({ projetoId: projeto.id })).length, 2);
  const anterior = await conexao.raw('SELECT is_deleted FROM projeto_volume_vigencia WHERE id = :id', { id: abril.id });
  assert.equal(anterior.rows[0].is_deleted, true);
  await registrar('2026-06-01', 0);
  await registrar('2026-08-01', null);
  assert.deepEqual(await consultar(), [null, 160, 160, 80, 80, 0, 0, null, null, null, null, null]);
  await servico.excluir({ projetoId: projeto.id, vigenciaId: substituta.id });
  assert.deepEqual((await consultar()).slice(0, 6), [null, 160, 160, 160, 160, 0]);
  const mensal = await projetoRepositorio.listarVolume({ dataInicio: '2026-04-01', dataFim: '2026-04-30' });
  assert.equal(mensal.find(linha => linha.projetoId === projeto.id)?.volumeEsperadoHorasMes, 160);
});

testarComBanco('índice parcial impede duas vigências ativas do mesmo mês e permite novo projeto', async conexao => {
  const projeto = await criarProjeto(conexao);
  const outroProjeto = await criarProjeto(conexao);
  const repositorio = new ProjetoVolumeVigenciaRepository(conexao);
  const dados = { projetoId: projeto.id, vigenciaInicioData: '2026-01-01', volumeEsperadoHoras: 160 };
  await repositorio.inserir(dados);
  await repositorio.inserir({ ...dados, projetoId: outroProjeto.id });
  await assert.rejects(() => conexao.transaction(async transacao => {
    await new ProjetoVolumeVigenciaRepository(transacao).inserir(dados);
  }), /uix_projeto_volume_vigencia_mes_ativo/);
  await assert.rejects(() => conexao.transaction(async transacao => {
    await new ProjetoVolumeVigenciaRepository(transacao).inserir({ ...dados, vigenciaInicioData: '2026-02-01', volumeEsperadoHoras: -1 });
  }), /chk_projeto_volume_vigencia_volume/);
});
