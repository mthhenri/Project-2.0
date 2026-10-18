import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ambienteEhProducao, CONEXOES_SEED, DEMANDAS_SEED } from './seed-desenvolvimento';

test('ambienteEhProducao recusa APP_AMBIENTE=production e DB_SSL=true', () => {
  assert.equal(ambienteEhProducao({ APP_AMBIENTE: 'production' }), true);
  assert.equal(ambienteEhProducao({ DB_SSL: 'true' }), true);
  assert.equal(ambienteEhProducao({ APP_AMBIENTE: 'development', DB_SSL: 'false' }), false);
  assert.equal(ambienteEhProducao({}), false);
});

test('o plano do seed é coerente: pais declarados antes dos filhos e conexões apontam para demandas existentes', () => {
  const vistas = new Set<string>();
  for (const demanda of DEMANDAS_SEED) {
    if (demanda.paiChave) assert.ok(vistas.has(demanda.paiChave), `pai ${demanda.paiChave} de ${demanda.chave}`);
    vistas.add(demanda.chave);
  }
  for (const conexao of CONEXOES_SEED) {
    assert.ok(vistas.has(conexao.origemChave) && vistas.has(conexao.destinoChave));
    assert.notEqual(conexao.origemChave, conexao.destinoChave);
  }
});
