import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { dataNoFuso, montarConversaId } from './chat-conversa';

describe('conversa do dia', () => {
  it('usa o dia do fuso configurado, não o do servidor', () => {
    // 02:30 UTC de 18/10 ainda é 17/10 à noite em São Paulo (UTC-3).
    const instante = new Date('2026-10-18T02:30:00Z');
    assert.equal(dataNoFuso(instante, 'America/Sao_Paulo'), '2026-10-17');
    assert.equal(dataNoFuso(instante, 'UTC'), '2026-10-18');
  });

  it('vira o dia à meia-noite do fuso', () => {
    assert.equal(montarConversaId(7, new Date('2026-10-18T02:59:59Z'), 'America/Sao_Paulo'), '7-2026-10-17');
    assert.equal(montarConversaId(7, new Date('2026-10-18T03:00:00Z'), 'America/Sao_Paulo'), '7-2026-10-18');
  });

  it('separa usuários', () => {
    const instante = new Date('2026-10-17T15:00:00Z');
    assert.notEqual(montarConversaId(1, instante, 'UTC'), montarConversaId(2, instante, 'UTC'));
  });
});
