import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { Knex } from 'knex';
import { ConfigService } from '../../../config/config.service';
import { ARMAZENAMENTO_DE_MENSAGEM_DIRETA, armazenamentoDeMensagemDiretaProvider } from './armazenamento-de-mensagem-direta';
import { MensagemDiretaElasticsearchRepository } from './mensagem-direta-elasticsearch.repository';
import { MensagemDiretaOpenSearchRepository } from './mensagem-direta-opensearch.repository';
import { MensagemDiretaPostgresRepository } from './mensagem-direta-postgres.repository';

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

const conexao = {} as Knex;

test('opensearch (o padrão), elasticsearch e postgres instanciam cada um a sua implementação', () => {
  assert.ok(armazenamentoDeMensagemDiretaProvider.useFactory(configuracao('opensearch'), conexao) instanceof MensagemDiretaOpenSearchRepository);
  assert.ok(armazenamentoDeMensagemDiretaProvider.useFactory(configuracao('elasticsearch'), conexao) instanceof MensagemDiretaElasticsearchRepository);
  assert.ok(armazenamentoDeMensagemDiretaProvider.useFactory(configuracao('postgres'), conexao) instanceof MensagemDiretaPostgresRepository);
});
