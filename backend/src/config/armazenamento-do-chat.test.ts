import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { lerArmazenamentoDoChat } from './armazenamento-do-chat';

describe('lerArmazenamentoDoChat', () => {
  it('o padrão é o OpenSearch do desenvolvimento', () => {
    assert.equal(lerArmazenamentoDoChat(undefined), 'opensearch');
    assert.equal(lerArmazenamentoDoChat('  '), 'opensearch');
  });

  it('aceita os três armazenamentos, sem diferenciar maiúsculas', () => {
    assert.equal(lerArmazenamentoDoChat('postgres'), 'postgres');
    assert.equal(lerArmazenamentoDoChat('OpenSearch'), 'opensearch');
    assert.equal(lerArmazenamentoDoChat(' Elasticsearch '), 'elasticsearch');
  });

  it('valor desconhecido derruba a subida com mensagem clara', () => {
    assert.throws(() => lerArmazenamentoDoChat('mongo'), /Armazenamento do chat não suportado: mongo/);
  });
});
