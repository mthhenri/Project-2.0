import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfigService } from '../../../config/config.service';
import { CheckinSuspensaoService } from './checkin-suspensao.service';

// Complementa `checkin-suspensao.test.ts` (suspender por usuário, retomar, meia-noite do fuso, executor e ferramentas): aqui, a volta da
// reunião que a agenda usa, o motivo e a virada do dia em outro fuso. SYSTEM.SPEC.md §12 (`checkin`).

function criar(instanteInicial = '2026-10-19T13:00:00Z', fusoHorario = 'America/Sao_Paulo') {
  let agora = new Date(instanteInicial);
  const configService = { obter: () => ({ aplicacao: { fusoHorario } }) } as unknown as ConfigService;
  const servico = new (class extends CheckinSuspensaoService {
    protected agora(): Date {
      return agora;
    }
  })(configService);
  return { servico, passarPara: (instante: string) => (agora = new Date(instante)) };
}

test('retomar registra a hora da volta, que a agenda do check-in usa para recomeçar a conta', () => {
  const { servico, passarPara } = criar('2026-10-19T13:00:00Z');
  assert.equal(servico.ultimaRetomada(7), null);
  servico.suspender(7, 'reunião');
  passarPara('2026-10-19T14:00:00Z');
  servico.retomar(7);
  assert.deepEqual(servico.ultimaRetomada(7), new Date('2026-10-19T14:00:00Z'));
});

test('retomar sem suspensão não registra volta nenhuma', () => {
  const { servico } = criar();
  assert.equal(servico.retomar(7), null);
  assert.equal(servico.ultimaRetomada(7), null);
});

test('a volta é por usuário', () => {
  const { servico } = criar();
  servico.suspender(7, null);
  servico.retomar(7);
  assert.notEqual(servico.ultimaRetomada(7), null);
  assert.equal(servico.ultimaRetomada(8), null);
});

test('suspender de novo substitui o motivo e o instante; motivo em branco vira null', () => {
  const { servico, passarPara } = criar('2026-10-19T13:00:00Z');
  servico.suspender(7, 'primeira');
  passarPara('2026-10-19T15:00:00Z');
  assert.deepEqual(servico.suspender(7, '   '), { suspenso: true, desde: new Date('2026-10-19T15:00:00Z'), motivo: null });
});

test('sem suspensão, a consulta diz que não está suspenso, sem data nem motivo', () => {
  assert.deepEqual(criar().servico.consultar(7), { suspenso: false, desde: null, motivo: null });
});

test('a virada do dia segue o fuso configurado, não o UTC', () => {
  const emTokyo = criar('2026-10-19T14:00:00Z', 'Asia/Tokyo'); // 23:00 de 19/10 em Tóquio
  emTokyo.servico.suspender(7, null);
  emTokyo.passarPara('2026-10-19T14:59:00Z'); // 23:59 em Tóquio
  assert.equal(emTokyo.servico.consultar(7).suspenso, true);
  emTokyo.passarPara('2026-10-19T15:00:00Z'); // 00:00 de 20/10 em Tóquio
  assert.equal(emTokyo.servico.consultar(7).suspenso, false);
});

test('a suspensão que acabou à meia-noite não deixa suspensão fantasma na consulta seguinte', () => {
  const { servico, passarPara } = criar('2026-10-19T13:00:00Z');
  servico.suspender(7, 'reunião');
  passarPara('2026-10-20T10:00:00Z');
  assert.equal(servico.consultar(7).suspenso, false);
  assert.equal(servico.retomar(7), null);
});
