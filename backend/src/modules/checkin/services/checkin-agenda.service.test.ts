import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { checkinDisparado } from '../domain/agenda-do-checkin';
import { CheckinAgendaService } from './checkin-agenda.service';

// SYSTEM.SPEC.md §12 (`checkin`): o próximo check-in de cada usuário é um estado passageiro, em memória e por usuário. A regra do
// cálculo mora em `calcularAgenda` (testada à parte); aqui, o que o service guarda, devolve e esquece, com o sorteio fixado.

const INICIO = new Date('2026-10-19T12:00:00Z');
const AGORA = new Date('2026-10-19T12:10:00Z');
const entrada = (execucaoId: number, sobrescrita: Record<string, unknown> = {}) => ({
  execucao: { id: execucaoId, inicio: INICIO }, suspenso: false, retomadaEm: null, agora: AGORA, minimoMinutos: 30, maximoMinutos: 80, ...sobrescrita,
});

function criar(sorteios: number[]) {
  const fila = [...sorteios];
  const servico = new (class extends CheckinAgendaService {
    protected sortear(): number {
      return fila.shift() ?? 0;
    }
  })();
  return servico;
}

const emMinutos = (minutos: number) => new Date(INICIO.getTime() + minutos * 60_000);

test('sorteia o horário entre o mínimo e o máximo da configuração, contado do início da execução', () => {
  assert.deepEqual(criar([0]).atualizar(7, entrada(1))?.proximoEm, emMinutos(30));
  const quaseMaximo = criar([0.999999]).atualizar(7, entrada(1))!.proximoEm.getTime();
  assert.ok(Math.abs(quaseMaximo - emMinutos(80).getTime()) <= 1000, 'sorteio no limite superior cai no máximo');
});

test('consultas repetidas da mesma execução devolvem o mesmo horário (o sorteio seguinte é descartado)', () => {
  const servico = criar([0, 1]);
  const primeira = servico.atualizar(7, entrada(1));
  const segunda = servico.atualizar(7, entrada(1));
  assert.deepEqual(segunda, primeira);
  assert.deepEqual(segunda?.proximoEm, emMinutos(30));
});

test('execução nova (troca de atividade, trecho seguinte) recomeça e sorteia de novo', () => {
  const servico = criar([0, 1]);
  const primeira = servico.atualizar(7, entrada(1));
  const outra = servico.atualizar(7, { ...entrada(2), execucao: { id: 2, inicio: new Date('2026-10-19T12:20:00Z') } });
  assert.equal(outra?.execucaoId, 2);
  assert.notDeepEqual(outra?.proximoEm, primeira?.proximoEm);
  assert.deepEqual(outra?.proximoEm, new Date(new Date('2026-10-19T12:20:00Z').getTime() + 80 * 60_000));
});

test('a volta da reunião recomeça a conta dali, uma vez só', () => {
  const servico = criar([0, 0, 1]);
  const antes = servico.atualizar(7, entrada(1));
  const volta = new Date('2026-10-19T12:30:00Z');
  const depois = servico.atualizar(7, entrada(1, { agora: new Date('2026-10-19T12:31:00Z'), retomadaEm: volta }));
  assert.deepEqual(depois?.proximoEm, new Date(volta.getTime() + 30 * 60_000));
  assert.notDeepEqual(depois?.proximoEm, antes?.proximoEm);
  const novamente = servico.atualizar(7, entrada(1, { agora: new Date('2026-10-19T12:32:00Z'), retomadaEm: volta }));
  assert.deepEqual(novamente, depois);
});

test('sem execução ou suspenso, não há agenda e o que estava guardado é esquecido (a execução seguinte sorteia do zero)', () => {
  const servico = criar([0, 0, 1]); // o sorteio é consumido a cada consulta, inclusive a sem execução
  servico.atualizar(7, entrada(1));
  assert.equal(servico.atualizar(7, { ...entrada(1), execucao: null }), null);
  const nova = servico.atualizar(7, entrada(1));
  assert.deepEqual(nova?.proximoEm, emMinutos(80));

  assert.equal(servico.atualizar(7, entrada(1, { suspenso: true })), null);
});

test('cada usuário tem a sua agenda: um não vaza para o outro', () => {
  const servico = criar([0, 1]);
  const doSete = servico.atualizar(7, entrada(1));
  const doOito = servico.atualizar(8, entrada(1));
  assert.deepEqual(doSete?.proximoEm, emMinutos(30));
  assert.deepEqual(doOito?.proximoEm, emMinutos(80));
  assert.equal(servico.atualizar(7, entrada(1))?.proximoEm.getTime(), emMinutos(30).getTime());
  servico.atualizar(8, { ...entrada(1), execucao: null });
  assert.equal(servico.atualizar(7, entrada(1))?.proximoEm.getTime(), emMinutos(30).getTime());
});

test('um serviço novo (backend reiniciado) não conhece a agenda anterior e sorteia de novo', () => {
  const antes = criar([0]).atualizar(7, entrada(1));
  const depois = criar([1]).atualizar(7, entrada(1));
  assert.notDeepEqual(antes?.proximoEm, depois?.proximoEm);
});

test('o check-in dispara quando o horário sorteado chega', () => {
  const agenda = criar([0]).atualizar(7, entrada(1));
  assert.equal(checkinDisparado(agenda, emMinutos(29)), false);
  assert.equal(checkinDisparado(agenda, emMinutos(30)), true);
});
