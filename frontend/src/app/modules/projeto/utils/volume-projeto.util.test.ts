import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { ProjetoVolumeResumoDto } from '@project20/shared';
import { montarLinhaDeVolume } from './volume-projeto.util';

const item = (minutosGastos: number, volumeEsperadoHorasMes: number | null): ProjetoVolumeResumoDto =>
  ({ projetoId: 1, nome: 'Projeto', codigo: 'P', cor: '#336699', minutosGastos, volumeEsperadoHorasMes });

test('12 h gastas de 40 h esperadas: 30%, sem estouro', () => {
  const linha = montarLinhaDeVolume(item(12 * 60, 40));
  assert.deepEqual([linha.minutosEsperados, linha.percentual, linha.percentualBarra, linha.estourou], [2400, 30, 30, false]);
});

test('sem volume esperado: só as horas, sem percentual, barra vazia e sem estouro', () => {
  const linha = montarLinhaDeVolume(item(5 * 60, null));
  assert.deepEqual([linha.minutosEsperados, linha.percentual, linha.percentualBarra, linha.estourou], [null, null, 0, false]);
});

test('mês sem execução: 0 h, 0%', () => {
  const linha = montarLinhaDeVolume(item(0, 40));
  assert.deepEqual([linha.percentual, linha.percentualBarra, linha.estourou], [0, 0, false]);
});

test('exatamente o esperado: 100% e ainda sem estouro; um minuto a mais estoura e a barra fica cheia', () => {
  const exato = montarLinhaDeVolume(item(40 * 60, 40));
  assert.deepEqual([exato.percentual, exato.estourou], [100, false]);
  const acima = montarLinhaDeVolume(item(40 * 60 + 1, 40));
  assert.deepEqual([acima.percentualBarra, acima.estourou], [100, true]);
});

test('estouro grande: o percentual real aparece e a barra para em 100', () => {
  const linha = montarLinhaDeVolume(item(60 * 60, 40));
  assert.deepEqual([linha.percentual, linha.percentualBarra, linha.estourou], [150, 100, true]);
});

test('volume esperado 0: sem percentual; qualquer hora gasta estoura', () => {
  const zerado = montarLinhaDeVolume(item(0, 0));
  assert.deepEqual([zerado.percentual, zerado.estourou], [null, false]);
  assert.equal(montarLinhaDeVolume(item(30, 0)).estourou, true);
});
