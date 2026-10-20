import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ProjetoVolumeMesDto } from '@project20/shared';
import { agruparVolumePorProjeto, limitesDoAno } from './volume-anual';

const linha = (projetoId: number, mes: number, minutosGastos: number, volumeEsperadoHorasMes: number | null = null): ProjetoVolumeMesDto =>
  ({ projetoId, nome: `Projeto ${projetoId}`, codigo: `P${projetoId}`, cor: '#336699', volumeEsperadoHorasMes, mes, minutosGastos });

test('limitesDoAno: de 1º de janeiro a 31 de dezembro', () => {
  assert.deepEqual(limitesDoAno(2026), { dataInicio: '2026-01-01', dataFim: '2026-12-31' });
});

test('agruparVolumePorProjeto: um item por projeto, doze meses em ordem (janeiro = índice 0)', () => {
  const linhas = [1, 2].flatMap((projetoId) => Array.from({ length: 12 }, (_, indice) => linha(projetoId, indice + 1, projetoId === 1 && indice === 9 ? 918 : 0, projetoId === 1 ? 40 : null)));
  const agrupado = agruparVolumePorProjeto(linhas);
  assert.deepEqual(agrupado.map((projeto) => projeto.projetoId), [1, 2]);
  assert.equal(agrupado[0].minutosGastosPorMes.length, 12);
  assert.equal(agrupado[0].minutosGastosPorMes[9], 918);
  assert.equal(agrupado[0].volumeEsperadoHorasMes, 40);
  assert.deepEqual(agrupado[1].minutosGastosPorMes, new Array(12).fill(0));
  assert.equal(agrupado[1].volumeEsperadoHorasMes, null);
});

test('agruparVolumePorProjeto: mês ausente vale 0 e sem linhas não há projetos', () => {
  const agrupado = agruparVolumePorProjeto([linha(5, 3, 60)]);
  assert.deepEqual(agrupado[0].minutosGastosPorMes, [0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(agruparVolumePorProjeto([]), []);
});
