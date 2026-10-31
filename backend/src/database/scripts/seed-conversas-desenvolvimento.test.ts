import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { LOGINS_SEED_CONVERSAS, montarConversasSeed, validarMensagemSeedExistente } from './seed-conversas-plano';
import { validarDestinoConversas } from './seed-conversas-desenvolvimento';
import { deFonteDireta, REGEX_UUID } from '../../modules/mensagem-direta/domain/mensagem-direta.documento';

const usuarios = () => LOGINS_SEED_CONVERSAS.map((login, indice) => ({
  login, id: indice + 1, tipo: indice === 6 ? 'ADMINISTRADOR' : 'DESENVOLVEDOR',
  createdDate: new Date(Date.now() - 91 * 86_400_000),
}));
const ambiente = { APP_AMBIENTE: 'development', DB_HOST: 'localhost', OPENSEARCH_URL: 'http://localhost:9200' };

test('conversas: destino estritamente local e development, armazenamento compatível', () => {
  assert.equal(validarDestinoConversas(ambiente), 'http://localhost:9200');
  for (const alteracao of [ { APP_AMBIENTE: '' }, { APP_AMBIENTE: 'test' }, { APP_AMBIENTE: 'production' },
    { NODE_ENV: 'production' }, { DB_SSL: 'true' }, { CHAT_ARMAZENAMENTO: 'postgres' },
    { CHAT_ARMAZENAMENTO: 'elasticsearch' }, { OPENSEARCH_URL: 'http://remoto:9200' },
    { OPENSEARCH_URL: 'http://localhost:9201' }, { OPENSEARCH_URL: 'https://localhost:9200' },
    { OPENSEARCH_URL: 'http://localhost:9200/outro' }, { DB_HOST: 'remoto' },
    { OPENSEARCH_URL: 'http://usuario:senha@localhost:9200' }, { OPENSEARCH_URL: '' } ]) {
    assert.throws(() => validarDestinoConversas({ ...ambiente, ...alteracao }));
  }
});

test('plano determinístico: 12 conversas, 72 mensagens, participantes e respostas consistentes', () => {
  const participantes = usuarios();
  const documentos = montarConversasSeed(participantes);
  assert.deepEqual(documentos, montarConversasSeed(participantes));
  assert.equal(documentos.length, 72);
  assert.equal(new Set(documentos.map((documento) => documento.mensagem_id)).size, 72);
  const conversas = [...new Set(documentos.map((documento) => documento.conversa_id))];
  assert.equal(conversas.length, 12);
  assert.equal(conversas.filter((conversa) => conversa.endsWith('-7')).length, 6);
  assert.equal(documentos.filter((documento) => documento.contem_codigo).length, 6);
  for (const documento of documentos) {
    assert.match(documento.mensagem_id, REGEX_UUID);
    assert.ok(documento.participantes.includes(documento.autor_usuario_id!));
    assert.ok(+new Date(documento.created_date) < Date.now());
    assert.equal(deFonteDireta(documento).texto, documento.texto);
    if (documento.responde_a_mensagem_id) {
      const anterior = documentos.find((candidato) => candidato.mensagem_id === documento.responde_a_mensagem_id)!;
      assert.ok(anterior);
      assert.equal(anterior.conversa_id, documento.conversa_id);
      assert.equal(anterior.autor_usuario_id, documento.responde_a_autor_usuario_id);
      assert.ok(+new Date(anterior.created_date) < +new Date(documento.created_date));
    }
  }
});

test('plano recusa usuário ausente, papel indevido ou histórico ainda não criado', () => {
  assert.throws(() => montarConversasSeed(usuarios().slice(1)), /Participante/);
  const invalidos = usuarios();
  invalidos[0].tipo = 'GESTOR';
  assert.throws(() => montarConversasSeed(invalidos), /Participante/);
  const recentes = usuarios();
  recentes[0].createdDate = new Date();
  assert.throws(() => montarConversasSeed(recentes), /histórico/);
});

test('repetição recusa mensagens antigas ligadas a outros ids de usuário', () => {
  const [documento] = montarConversasSeed(usuarios());
  assert.doesNotThrow(() => validarMensagemSeedExistente(documento, { ...documento }));
  assert.throws(() => validarMensagemSeedExistente(documento, { ...documento, participantes: [80, 81] }), /diverge/);
  assert.throws(() => validarMensagemSeedExistente(documento, { ...documento, texto: 'outro conteúdo' }), /diverge/);
});
