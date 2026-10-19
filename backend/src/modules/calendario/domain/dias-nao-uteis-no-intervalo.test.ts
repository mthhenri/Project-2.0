import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ocorrenciasNoIntervalo } from './dias-nao-uteis-no-intervalo';

// SYSTEM.SPEC.md §14 "Dias Não Úteis": recorrente vale em qualquer ano; não recorrente só na própria data.

const recorrente = (diaData: string, nome = diaData) => ({ diaData, recorrente: true, nome });
const pontual = (diaData: string, nome = diaData) => ({ diaData, recorrente: false, nome });
const datas = (resultado: { data: string }[]) => resultado.map((item) => item.data);

test('intervalo que atravessa o ano: recorrentes de dezembro e janeiro aparecem cada um no seu ano', () => {
  const resultado = ocorrenciasNoIntervalo([recorrente('2020-12-25'), recorrente('2020-01-01')], '2026-12-20', '2027-01-10');
  assert.deepEqual(datas(resultado), ['2026-12-25', '2027-01-01']);
});

test('intervalo de vários anos repete o recorrente em cada um, em ordem de data', () => {
  const resultado = ocorrenciasNoIntervalo([recorrente('2000-05-01')], '2025-01-01', '2027-12-31');
  assert.deepEqual(datas(resultado), ['2025-05-01', '2026-05-01', '2027-05-01']);
});

test('o não recorrente só aparece se a própria data cair no intervalo, mesmo de outro ano', () => {
  const dia = pontual('2026-03-10');
  assert.deepEqual(datas(ocorrenciasNoIntervalo([dia], '2026-03-01', '2026-03-31')), ['2026-03-10']);
  assert.deepEqual(ocorrenciasNoIntervalo([dia], '2027-03-01', '2027-03-31'), []);
});

test('recorrente e pontual na mesma data aparecem os dois', () => {
  const resultado = ocorrenciasNoIntervalo([recorrente('2020-03-10', 'fixo'), pontual('2026-03-10', 'único')], '2026-03-01', '2026-03-31');
  assert.deepEqual(resultado.map((item) => [item.data, item.dia.nome]).sort(), [['2026-03-10', 'fixo'], ['2026-03-10', 'único']]);
});

test('as bordas do intervalo contam e o intervalo sem ocorrência devolve vazio', () => {
  assert.deepEqual(datas(ocorrenciasNoIntervalo([recorrente('2020-03-10')], '2026-03-10', '2026-03-10')), ['2026-03-10']);
  assert.deepEqual(ocorrenciasNoIntervalo([recorrente('2020-03-10')], '2026-03-11', '2026-03-20'), []);
  assert.deepEqual(ocorrenciasNoIntervalo([], '2026-01-01', '2026-12-31'), []);
});

test('o DATE do banco chega como Date e vale pelo dia de calendário', () => {
  const resultado = ocorrenciasNoIntervalo([{ diaData: new Date(2020, 11, 25), recorrente: true }], '2026-12-01', '2026-12-31');
  assert.deepEqual(datas(resultado), ['2026-12-25']);
});

test('29/02 recorrente existe em ano bissexto', () => {
  assert.deepEqual(datas(ocorrenciasNoIntervalo([recorrente('2020-02-29')], '2028-02-01', '2028-03-31')), ['2028-02-29']);
});

test('29/02 recorrente não gera uma data inexistente em ano não bissexto', { todo: 'P-016' }, () => {
  assert.deepEqual(datas(ocorrenciasNoIntervalo([recorrente('2020-02-29')], '2027-02-01', '2027-03-31')), []);
});
