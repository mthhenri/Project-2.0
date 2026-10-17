import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  dataIsoNoFuso,
  dataHoraNoFuso,
  diaMesNoFuso,
  horaNoFuso,
  hojeNoFuso,
  instanteParaRelogioLocal,
  relogioLocalParaInstante,
} from './fuso-horario';

const SAO_PAULO = 'America/Sao_Paulo';

// 2026-10-17T01:30Z é 22:30 de 16/10 em São Paulo (UTC-3) e já é dia 17 em UTC.
const MADRUGADA_UTC = new Date('2026-10-17T01:30:00.000Z');

test('dataIsoNoFuso: o dia é o do fuso, não o do UTC', () => {
  assert.equal(dataIsoNoFuso(MADRUGADA_UTC, SAO_PAULO), '2026-10-16');
  assert.equal(dataIsoNoFuso(MADRUGADA_UTC, 'UTC'), '2026-10-17');
});

test('horaNoFuso e diaMesNoFuso usam o relógio do fuso, com a meia-noite como 00', () => {
  assert.equal(horaNoFuso(MADRUGADA_UTC, SAO_PAULO), '22:30');
  assert.equal(diaMesNoFuso(MADRUGADA_UTC, SAO_PAULO), '16/10');
  assert.equal(horaNoFuso(new Date('2026-10-17T03:05:00.000Z'), SAO_PAULO), '00:05');
});

test('hojeNoFuso: meia-noite local com o ano/mês/dia do fuso', () => {
  const hoje = hojeNoFuso(SAO_PAULO, MADRUGADA_UTC);
  assert.deepEqual([hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), hoje.getHours()], [2026, 9, 16, 0]);
});

test('instanteParaRelogioLocal e relogioLocalParaInstante são inversos', () => {
  const relogio = instanteParaRelogioLocal(MADRUGADA_UTC, SAO_PAULO);
  assert.deepEqual([relogio.getDate(), relogio.getHours(), relogio.getMinutes()], [16, 22, 30]);
  assert.equal(relogioLocalParaInstante(relogio, SAO_PAULO).toISOString(), MADRUGADA_UTC.toISOString());
});

test('relogioLocalParaInstante: 08:00 do relógio de São Paulo é 11:00Z', () => {
  const instante = relogioLocalParaInstante(new Date(2026, 9, 15, 8, 0, 0), SAO_PAULO);
  assert.equal(instante.toISOString(), '2026-10-15T11:00:00.000Z');
});

test('dataHoraNoFuso: dd/MM/yyyy HH:mm no relógio do fuso', () => {
  assert.equal(dataHoraNoFuso(MADRUGADA_UTC, SAO_PAULO), '16/10/2026 22:30');
});
