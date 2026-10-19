import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ConfigService } from './config.service';

// Mexe em process.env (a ConfigService lê dali): guarda e restaura para não vazar para outros testes.
let ambienteOriginal: NodeJS.ProcessEnv;
beforeEach(() => { ambienteOriginal = { ...process.env }; });
afterEach(() => {
  for (const chave of Object.keys(process.env)) delete process.env[chave];
  Object.assign(process.env, ambienteOriginal);
});

const OBRIGATORIAS: Record<string, string> = {
  DB_HOST: 'localhost', DB_PORT: '5433', DB_NOME: 'project20', DB_USUARIO: 'postgres', DB_SENHA: 'postgres',
  JWT_SECRETO: 'segredo', JWT_EXPIRACAO: '8h', INTERVALO_MINIMO_MINUTOS: '15', APP_PORTA: '3000', APP_AMBIENTE: 'development',
  OPENSEARCH_URL: 'http://localhost:9200',
};

function definirAmbiente(sobrescrita: Record<string, string | undefined> = {}, base = OBRIGATORIAS): void {
  for (const chave of Object.keys(process.env)) delete process.env[chave];
  for (const [chave, valor] of Object.entries({ ...base, ...sobrescrita })) {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  }
}

test('lê as variáveis obrigatórias e tipa porta e intervalo como número', () => {
  definirAmbiente();
  const configuracao = new ConfigService().obter();
  assert.equal(configuracao.bancoDados.host, 'localhost');
  assert.equal(configuracao.bancoDados.porta, 5433);
  assert.equal(configuracao.negocio.intervaloMinimoMinutos, 15);
  assert.equal(configuracao.aplicacao.porta, 3000);
  assert.equal(configuracao.jwt.expiracao, '8h');
});

test('cada variável obrigatória ausente derruba a subida citando o nome dela', () => {
  for (const chave of ['DB_HOST', 'DB_PORT', 'DB_NOME', 'DB_USUARIO', 'DB_SENHA', 'JWT_SECRETO', 'JWT_EXPIRACAO', 'INTERVALO_MINIMO_MINUTOS', 'APP_AMBIENTE']) {
    definirAmbiente({ [chave]: undefined });
    assert.throws(() => new ConfigService(), new RegExp(`obrigatória ausente: ${chave}`), chave);
  }
});

test('variável obrigatória vazia conta como ausente', () => {
  definirAmbiente({ JWT_SECRETO: '' });
  assert.throws(() => new ConfigService(), /JWT_SECRETO/);
});

test('APP_PORTA é obrigatória, mas PORT (injetada pela plataforma) tem prioridade e a dispensa', () => {
  definirAmbiente({ APP_PORTA: undefined });
  assert.throws(() => new ConfigService(), /APP_PORTA/);
  definirAmbiente({ APP_PORTA: undefined, PORT: '8080' });
  assert.equal(new ConfigService().obter().aplicacao.porta, 8080);
  definirAmbiente({ PORT: '8080' });
  assert.equal(new ConfigService().obter().aplicacao.porta, 8080);
});

test('APP_TIMEZONE ausente cai em America/Sao_Paulo; informado, vale o informado', () => {
  definirAmbiente({ APP_TIMEZONE: undefined });
  assert.equal(new ConfigService().obter().aplicacao.fusoHorario, 'America/Sao_Paulo');
  definirAmbiente({ APP_TIMEZONE: 'UTC' });
  assert.equal(new ConfigService().obter().aplicacao.fusoHorario, 'UTC');
});

test('DB_SSL só liga com o texto "true"', () => {
  definirAmbiente({ DB_SSL: undefined });
  assert.equal(new ConfigService().obter().bancoDados.ssl, false);
  definirAmbiente({ DB_SSL: 'false' });
  assert.equal(new ConfigService().obter().bancoDados.ssl, false);
  definirAmbiente({ DB_SSL: 'true' });
  assert.equal(new ConfigService().obter().bancoDados.ssl, true);
});

test('CHAT_ARMAZENAMENTO ausente é opensearch e exige OPENSEARCH_URL', () => {
  definirAmbiente({ CHAT_ARMAZENAMENTO: undefined });
  assert.equal(new ConfigService().obter().chat.armazenamento, 'opensearch');
  definirAmbiente({ CHAT_ARMAZENAMENTO: undefined, OPENSEARCH_URL: undefined });
  assert.throws(() => new ConfigService(), /OPENSEARCH_URL/);
});

test('com CHAT_ARMAZENAMENTO=postgres o OpenSearch deixa de ser exigido', () => {
  definirAmbiente({ CHAT_ARMAZENAMENTO: 'postgres', OPENSEARCH_URL: undefined });
  assert.equal(new ConfigService().obter().chat.armazenamento, 'postgres');
});

test('com CHAT_ARMAZENAMENTO=elasticsearch a ELASTICSEARCH_URL passa a ser exigida', () => {
  definirAmbiente({ CHAT_ARMAZENAMENTO: 'elasticsearch', ELASTICSEARCH_URL: undefined });
  assert.throws(() => new ConfigService(), /ELASTICSEARCH_URL/);
  definirAmbiente({ CHAT_ARMAZENAMENTO: 'elasticsearch', ELASTICSEARCH_URL: 'http://localhost:9201' });
  assert.equal(new ConfigService().obter().elasticsearch.url, 'http://localhost:9201');
});

test('DESKTOP_PASTA_EXECUTAVEIS é opcional: ausente, não há download do Project Desktop', () => {
  definirAmbiente({ DESKTOP_PASTA_EXECUTAVEIS: undefined });
  assert.equal(new ConfigService().obter().desktop.pastaExecutaveis, undefined);
  definirAmbiente({ DESKTOP_PASTA_EXECUTAVEIS: '/srv/desktop' });
  assert.equal(new ConfigService().obter().desktop.pastaExecutaveis, '/srv/desktop');
});

test('ANTHROPIC_API_KEY é opcional', () => {
  definirAmbiente({ ANTHROPIC_API_KEY: undefined });
  assert.equal(new ConfigService().obter().anthropic.apiKey, undefined);
});

test('o .env.example sozinho (com os valores que ele traz) é uma configuração válida e os padrões documentados valem', () => {
  const exemplo = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../../../.env.example')));
  definirAmbiente({}, exemplo as Record<string, string>);
  const configuracao = new ConfigService().obter();
  assert.equal(configuracao.negocio.intervaloMinimoMinutos, 15);
  assert.equal(configuracao.aplicacao.fusoHorario, 'America/Sao_Paulo');
  assert.equal(configuracao.aplicacao.porta, 3000);
  assert.equal(configuracao.chat.armazenamento, 'opensearch');
});
