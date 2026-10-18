import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { montarAberturaDoDia } from './abertura-do-dia';

test('a abertura leva a hora, o dia e o dia útil anterior, e manda usar as ferramentas de leitura', () => {
  const texto = montarAberturaDoDia({ hora: '08:15', diaDaSemana: 'segunda-feira', hoje: '19/10', diaUtilAnterior: '16/10' });
  assert.match(texto, /08:15 de segunda-feira, 19\/10/);
  assert.match(texto, /dia útil anterior foi 16\/10/);
  for (const ferramenta of ['consultar_pad', 'listar_minhas_atividades', 'consultar_execucao_ativa']) assert.ok(texto.includes(ferramenta), ferramenta);
  assert.match(texto, /Não proponha nenhuma ação/);
});
