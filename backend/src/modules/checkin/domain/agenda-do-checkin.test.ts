import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AgendaDoCheckin, EntradaDaAgenda, calcularAgenda, checkinDisparado, sortearProximoCheckin } from './agenda-do-checkin';

const INICIO = new Date('2026-10-19T12:00:00Z');
const AGORA = new Date('2026-10-19T12:10:00Z');

function entrada(sobrescrever: Partial<EntradaDaAgenda> = {}): EntradaDaAgenda {
  return {
    anterior: null,
    execucao: { id: 5, inicio: INICIO },
    suspenso: false,
    retomadaEm: null,
    agora: AGORA,
    minimoMinutos: 30,
    maximoMinutos: 80,
    aleatorio: 0,
    ...sobrescrever,
  };
}

test('o sorteio fica entre o mínimo e o máximo depois da base', () => {
  assert.equal(sortearProximoCheckin(INICIO, 30, 80, 0).toISOString(), '2026-10-19T12:30:00.000Z');
  assert.equal(sortearProximoCheckin(INICIO, 30, 80, 0.999999).getTime() - INICIO.getTime() <= 80 * 60_000, true);
  assert.equal(sortearProximoCheckin(INICIO, 30, 80, 0.5).toISOString(), '2026-10-19T12:55:00.000Z');
});

test('máximo menor que o mínimo vale o mínimo', () => {
  assert.equal(sortearProximoCheckin(INICIO, 30, 10, 0.9).toISOString(), '2026-10-19T12:30:00.000Z');
});

test('sem execução ou com check-ins suspensos não há agenda', () => {
  assert.equal(calcularAgenda(entrada({ execucao: null })), null);
  assert.equal(calcularAgenda(entrada({ suspenso: true })), null);
});

test('execução nova sorteia a partir do início da execução, nunca logo depois do início', () => {
  const agenda = calcularAgenda(entrada({ aleatorio: 0 }));
  assert.equal(agenda?.execucaoId, 5);
  assert.equal(agenda?.proximoEm.toISOString(), '2026-10-19T12:30:00.000Z');
  assert.equal(checkinDisparado(agenda, AGORA), false);
});

test('a mesma execução mantém o horário sorteado, mesmo com outro número no sorteio', () => {
  const primeira = calcularAgenda(entrada({ aleatorio: 0.2 })) as AgendaDoCheckin;
  const segunda = calcularAgenda(entrada({ anterior: primeira, aleatorio: 0.9 })) as AgendaDoCheckin;
  assert.equal(segunda, primeira);
});

test('outra execução (troca de atividade ou trecho seguinte) sorteia de novo', () => {
  const anterior = calcularAgenda(entrada()) as AgendaDoCheckin;
  const nova = new Date('2026-10-19T13:00:00Z');
  const seguinte = calcularAgenda(entrada({ anterior, execucao: { id: 6, inicio: nova }, agora: nova })) as AgendaDoCheckin;
  assert.equal(seguinte.execucaoId, 6);
  assert.equal(seguinte.proximoEm.toISOString(), '2026-10-19T13:30:00.000Z');
});

test('depois de voltar da reunião a conta recomeça da volta, não do início da execução', () => {
  const anterior: AgendaDoCheckin = { execucaoId: 5, calculadaEm: AGORA, proximoEm: new Date('2026-10-19T12:30:00Z') };
  const volta = new Date('2026-10-19T14:00:00Z');
  const agenda = calcularAgenda(entrada({ anterior, retomadaEm: volta, agora: volta })) as AgendaDoCheckin;
  assert.equal(agenda.proximoEm.toISOString(), '2026-10-19T14:30:00.000Z');
  assert.equal(checkinDisparado(agenda, volta), false);
});

test('dispara quando o horário chega e continua disparado até a execução mudar', () => {
  const agenda = calcularAgenda(entrada()) as AgendaDoCheckin;
  assert.equal(checkinDisparado(agenda, new Date('2026-10-19T12:29:59Z')), false);
  assert.equal(checkinDisparado(agenda, new Date('2026-10-19T12:30:00Z')), true);
  assert.equal(checkinDisparado(agenda, new Date('2026-10-19T15:00:00Z')), true);
  assert.equal(checkinDisparado(null, AGORA), false);
});
