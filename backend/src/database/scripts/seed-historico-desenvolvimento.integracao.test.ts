import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { testarComBanco } from '../../testes/banco-teste';
import { semearHistorico } from './seed-historico-desenvolvimento';

testarComBanco('seed real: contagens, gestor preservado, repetição e períodos sem sobreposição', async (conexao) => {
  const gestorAntes = await conexao.raw("SELECT * FROM usuario WHERE login = 'gestor.inicial' AND is_deleted = false");
  await semearHistorico(conexao, { APP_AMBIENTE: 'development' });
  const projetos = await conexao('projeto').whereIn('codigo', ['DEV-PORTAL', 'DEV-ESTOQUE', 'DEV-AGENDA']).where('is_deleted', false);
  assert.equal(projetos.length, 3);
  const demandas = await conexao('demanda').whereIn('projeto_id', projetos.map((projeto) => projeto.id)).where('is_deleted', false);
  assert.equal(demandas.length, 21);
  const atividades = await conexao('atividade').whereIn('demanda_id', demandas.map((demanda) => demanda.id)).where('is_deleted', false);
  assert.equal(atividades.length, 108);
  const listarExecucoes = () => conexao('execucao').whereIn('atividade_id', atividades.map((atividade) => atividade.id)).where('is_deleted', false);
  const execucoes = await listarExecucoes();
  assert.ok(execucoes.length > 600);
  const usuarios = await conexao('usuario').where('login', 'like', 'dev.mateus.%').where('is_deleted', false);
  assert.equal(usuarios.length, 6);
  for (const usuario of usuarios) {
    const idsAtividades = atividades.filter((atividade) => atividade.usuario_id === usuario.id).map((atividade) => atividade.id);
    const periodos = execucoes.filter((execucao) => idsAtividades.includes(execucao.atividade_id))
      .sort((primeira, segunda) => +new Date(primeira.inicio_data) - +new Date(segunda.inicio_data));
    for (let indice = 0; indice < periodos.length; indice++) {
      assert.ok(periodos[indice].fim_data);
      assert.ok(+new Date(periodos[indice].fim_data) > +new Date(periodos[indice].inicio_data));
      if (indice) assert.ok(+new Date(periodos[indice - 1].fim_data) <= +new Date(periodos[indice].inicio_data));
    }
  }
  await semearHistorico(conexao, { APP_AMBIENTE: 'development' });
  assert.equal((await listarExecucoes()).length, execucoes.length);
  assert.deepEqual((await conexao.raw("SELECT * FROM usuario WHERE login = 'gestor.inicial' AND is_deleted = false")).rows, gestorAntes.rows);
  await conexao('atividade').where('id', atividades[0].id).update({ is_deleted: true, deleted_date: new Date() });
  await assert.rejects(semearHistorico(conexao, { APP_AMBIENTE: 'development' }), /Colisão parcial/);
});

testarComBanco('SQL recusa execução direta sem indicação de ambiente', async (conexao) => {
  await assert.rejects(conexao.transaction(async (transacao) => {
    await transacao.raw(readFileSync(join(__dirname, 'seed-historico-desenvolvimento.sql'), 'utf8'));
  }), /Seed recusado/);
});
