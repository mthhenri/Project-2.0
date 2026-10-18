import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { formatarPeriodo, horaNoFuso, instanteNoFuso, validarPeriodoDaExecucao } from './periodo-da-execucao';

const SP = 'America/Sao_Paulo';

test('instanteNoFuso lê dia e hora no horário do fuso, não no do servidor', () => {
  assert.equal(instanteNoFuso('2026-10-17', '14:00', SP).toISOString(), '2026-10-17T17:00:00.000Z');
  assert.equal(instanteNoFuso('2026-10-17', '23:30', SP).toISOString(), '2026-10-18T02:30:00.000Z');
  assert.equal(instanteNoFuso('2026-10-17', '14:00', 'UTC').toISOString(), '2026-10-17T14:00:00.000Z');
});

test('instanteNoFuso e horaNoFuso são inversos', () => {
  const instante = instanteNoFuso('2026-03-05', '08:45', SP);
  assert.equal(horaNoFuso(instante, SP), '08:45');
});

test('instanteNoFuso acompanha o horário de verão de um fuso que o tem', () => {
  assert.equal(instanteNoFuso('2026-01-15', '12:00', 'America/New_York').toISOString(), '2026-01-15T17:00:00.000Z');
  assert.equal(instanteNoFuso('2026-07-15', '12:00', 'America/New_York').toISOString(), '2026-07-15T16:00:00.000Z');
});

test('formatarPeriodo mostra a data uma vez no mesmo dia, as duas se atravessa o dia e "em andamento" sem fim', () => {
  const inicio = instanteNoFuso('2026-10-17', '14:00', SP);
  assert.equal(formatarPeriodo(inicio, instanteNoFuso('2026-10-17', '16:00', SP), SP), '17/10/2026, 14:00 às 16:00');
  assert.equal(formatarPeriodo(inicio, instanteNoFuso('2026-10-18', '02:00', SP), SP), '17/10/2026 14:00 às 18/10/2026 02:00');
  assert.equal(formatarPeriodo(inicio, null, SP), '17/10/2026, 14:00 (em andamento)');
});

test('validarPeriodoDaExecucao recusa futuro, fim antes do início e aceita o período certo', () => {
  const agora = new Date('2026-10-18T20:00:00Z');
  const inicio = new Date('2026-10-17T17:00:00Z');
  assert.doesNotThrow(() => validarPeriodoDaExecucao(inicio, new Date('2026-10-17T19:00:00Z'), agora));
  assert.doesNotThrow(() => validarPeriodoDaExecucao(inicio, null, agora));
  assert.throws(() => validarPeriodoDaExecucao(new Date('2026-10-19T10:00:00Z'), null, agora), BusinessException);
  assert.throws(() => validarPeriodoDaExecucao(inicio, new Date('2026-10-19T10:00:00Z'), agora), BusinessException);
  assert.throws(() => validarPeriodoDaExecucao(inicio, new Date('2026-10-17T17:00:00Z'), agora), BusinessException);
  assert.throws(() => validarPeriodoDaExecucao(inicio, new Date('2026-10-17T16:00:00Z'), agora), BusinessException);
});
