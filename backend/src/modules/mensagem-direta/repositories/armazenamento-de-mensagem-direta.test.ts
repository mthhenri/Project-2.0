import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ConfigService } from '../../../config/config.service';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, armazenamentoDeMensagemDiretaProvider } from './armazenamento-de-mensagem-direta';
import { MensagemDiretaElasticsearchRepository } from './mensagem-direta-elasticsearch.repository';
import { MensagemDiretaOpenSearchRepository } from './mensagem-direta-opensearch.repository';

// O provider escolhe a implementação por CHAT_ARMAZENAMENTO, a mesma variável do chat da IA, e só instancia a escolhida.

const configuracao = (armazenamento: string) =>
  ({
    obter: () => ({
      chat: { armazenamento },
      openSearch: { url: 'http://localhost:9200', usuario: undefined, senha: undefined },
      elasticsearch: { url: 'http://localhost:9201', usuario: undefined, senha: undefined, apiKey: undefined },
    }),
  }) as unknown as ConfigService;

test('o token do provider é o do armazenamento das mensagens diretas, distinto do chat da IA', () => {
  assert.equal(armazenamentoDeMensagemDiretaProvider.provide, ARMAZENAMENTO_DE_MENSAGEM_DIRETA);
  assert.notEqual(ARMAZENAMENTO_DE_MENSAGEM_DIRETA, 'ARMAZENAMENTO_DE_CHAT');
});

test('opensearch (o padrão) e elasticsearch instanciam cada um a sua implementação', () => {
  assert.ok(armazenamentoDeMensagemDiretaProvider.useFactory(configuracao('opensearch')) instanceof MensagemDiretaOpenSearchRepository);
  assert.ok(armazenamentoDeMensagemDiretaProvider.useFactory(configuracao('elasticsearch')) instanceof MensagemDiretaElasticsearchRepository);
});

test('postgres ainda não tem armazenamento das mensagens diretas e falha na subida apontando a task 207', () => {
  assert.throws(() => armazenamentoDeMensagemDiretaProvider.useFactory(configuracao('postgres')), /task 207/);
});
