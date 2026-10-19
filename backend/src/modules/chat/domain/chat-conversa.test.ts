import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { dataNoFuso, instanteDoDiaUtilAnterior, montarConversaId, nomePadraoDaConversa } from './chat-conversa';

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

describe('dia útil anterior', () => {
  it('terça olha para segunda; segunda e domingo olham para sexta', () => {
    const fuso = 'America/Sao_Paulo';
    assert.equal(dataNoFuso(instanteDoDiaUtilAnterior(new Date('2026-10-20T15:00:00Z'), fuso), fuso), '2026-10-19'); // terça
    assert.equal(dataNoFuso(instanteDoDiaUtilAnterior(new Date('2026-10-19T15:00:00Z'), fuso), fuso), '2026-10-16'); // segunda
    assert.equal(dataNoFuso(instanteDoDiaUtilAnterior(new Date('2026-10-18T15:00:00Z'), fuso), fuso), '2026-10-16'); // domingo
  });
});

describe('nome padrão da conversa', () => {
  it('escreve o dia, o mês por extenso e o ano', () => {
    assert.equal(nomePadraoDaConversa('7-2026-10-19'), 'Chat do dia 19 de outubro de 2026');
  });

  it('tira o zero à esquerda do dia e do mês', () => {
    assert.equal(nomePadraoDaConversa('7-2026-03-05'), 'Chat do dia 5 de março de 2026');
    assert.equal(nomePadraoDaConversa('7-2026-01-01'), 'Chat do dia 1 de janeiro de 2026');
  });

  it('cobre os doze meses e a virada de ano', () => {
    assert.equal(nomePadraoDaConversa('7-2025-12-31'), 'Chat do dia 31 de dezembro de 2025');
    assert.equal(nomePadraoDaConversa('7-2026-01-01'), 'Chat do dia 1 de janeiro de 2026');
  });

  it('usa só o fim do id, qualquer que seja o número do usuário', () => {
    assert.equal(nomePadraoDaConversa('123456-2026-02-28'), 'Chat do dia 28 de fevereiro de 2026');
  });
});
