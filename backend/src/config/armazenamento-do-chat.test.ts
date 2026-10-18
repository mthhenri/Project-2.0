import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { lerArmazenamentoDoChat } from './armazenamento-do-chat';

describe('lerArmazenamentoDoChat', () => {
  it('o padrão é o OpenSearch do desenvolvimento', () => {
    assert.equal(lerArmazenamentoDoChat(undefined), 'opensearch');
    assert.equal(lerArmazenamentoDoChat('  '), 'opensearch');
  });

  it('aceita os dois armazenamentos implementados, sem diferenciar maiúsculas', () => {
    assert.equal(lerArmazenamentoDoChat('postgres'), 'postgres');
    assert.equal(lerArmazenamentoDoChat('OpenSearch'), 'opensearch');
  });

  it('elasticsearch (ainda sem implementação) e valores inválidos derrubam a subida com mensagem clara', () => {
    for (const valor of ['elasticsearch', 'mongo']) {
      assert.throws(() => lerArmazenamentoDoChat(valor), /Armazenamento do chat não suportado/);
    }
  });
});
