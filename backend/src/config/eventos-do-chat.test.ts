import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { lerEventosDoChat } from './eventos-do-chat';

describe('lerEventosDoChat', () => {
  it('o padrão é a memória do desenvolvimento', () => {
    assert.equal(lerEventosDoChat(undefined), 'memoria');
    assert.equal(lerEventosDoChat('  '), 'memoria');
  });

  it('aceita os dois barramentos, sem diferenciar maiúsculas', () => {
    assert.equal(lerEventosDoChat('postgres'), 'postgres');
    assert.equal(lerEventosDoChat(' Memoria '), 'memoria');
  });

  it('valor desconhecido derruba a subida com mensagem clara', () => {
    assert.throws(() => lerEventosDoChat('redis'), /Barramento de eventos do chat não suportado: redis/);
  });
});
