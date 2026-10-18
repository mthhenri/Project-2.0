import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { montarRetomadaAposQueda } from './retomada-apos-queda';

const BASE = { hora: '14:05', horaDaUltimaMensagem: '13:40', desde: '2026-10-19T16:40:00.000Z', propostasDescartadas: 0 };

test('a instrução pede a ferramenta com o instante da última mensagem e a execução ativa', () => {
  const texto = montarRetomadaAposQueda(BASE);
  assert.match(texto, /Retomada/);
  assert.match(texto, /consultar_mudancas_da_queda com desde="2026-10-19T16:40:00.000Z"/);
  assert.match(texto, /consultar_execucao_ativa/);
  assert.match(texto, /13:40/);
});

test('só fala das propostas descartadas quando houve alguma', () => {
  assert.doesNotMatch(montarRetomadaAposQueda(BASE), /obsolet/);
  assert.match(montarRetomadaAposQueda({ ...BASE, propostasDescartadas: 1 }), /Uma proposta pendente ficou obsoleta/);
  assert.match(montarRetomadaAposQueda({ ...BASE, propostasDescartadas: 3 }), /3 propostas pendentes ficaram obsoletas/);
});
