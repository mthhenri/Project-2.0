import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { montarEsqueletoDeTabela } from './esqueleto-tabela';

test('montarEsqueletoDeTabela devolve os rótulos e uma coluna proporcional ao peso de cada uma', () => {
  const esqueleto = montarEsqueletoDeTabela([
    { rotulo: 'Usuário', peso: 248 },
    { rotulo: '', peso: 128 },
  ]);
  assert.deepEqual(esqueleto.cabecalhos, ['Usuário', '']);
  assert.equal(esqueleto.larguras, 'minmax(0, 248fr) minmax(0, 128fr)');
});
