import { Client, API } from '@opensearch-project/opensearch';
import knex, { Knex } from 'knex';
import configuracao from '../knexfile';
import { validarAmbienteSeed } from './seed-historico-desenvolvimento';
import { LOGINS_SEED_CONVERSAS, montarConversasSeed, UsuarioSeedConversa, validarMensagemSeedExistente } from './seed-conversas-plano';
import { INDICE_MENSAGEM_DIRETA, MAPEAMENTO_MENSAGEM_DIRETA } from '../../modules/mensagem-direta/domain/mensagem-direta-consultas';
import { INDICE_CHAT_MENSAGEM, INDICE_CHAT_CONVERSA, MAPEAMENTO_CHAT_MENSAGEM, MAPEAMENTO_CHAT_CONVERSA } from '../../modules/chat/domain/chat-consultas';

export function validarDestinoConversas(ambiente: NodeJS.ProcessEnv): string {
  validarAmbienteSeed(ambiente);
  if ((ambiente.CHAT_ARMAZENAMENTO ?? 'opensearch').toLowerCase() !== 'opensearch') {
    throw new Error('Este seed de conversas exige CHAT_ARMAZENAMENTO=opensearch.');
  }
  const url = new URL(ambiente.OPENSEARCH_URL ?? '');
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.port !== '9200' || url.pathname !== '/' || url.search || url.hash || url.username || url.password ||
      !['localhost', '127.0.0.1', '::1'].includes(ambiente.DB_HOST ?? '')) {
    throw new Error('Seed de conversas permitido somente com PostgreSQL local e OpenSearch HTTP local na porta 9200.');
  }
  return url.origin;
}

/** Limpeza somente quando explicitamente pedida. O modo normal cria só mensagens ainda ausentes. */
export async function semearConversas(conexao: Knex, ambiente: NodeJS.ProcessEnv, limparOpenSearch = false): Promise<void> {
  const url = validarDestinoConversas(ambiente);
  const usuarios = await conexao.raw(
    `SELECT usuario.id, usuario.login, usuario.created_date AS "createdDate", tipo_usuario.codigo AS tipo
     FROM usuario
     JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id AND tipo_usuario.is_deleted = false
     JOIN tipo_usuario_status ON tipo_usuario_status.id = usuario.tipo_usuario_status_id AND tipo_usuario_status.is_deleted = false
     WHERE usuario.is_deleted = false AND tipo_usuario_status.codigo = 'ATIVO'
       AND usuario.login = ANY(:logins)`, { logins: [...LOGINS_SEED_CONVERSAS] },
  );
  // Validar todo o plano antes de qualquer exclusão, inclusive as datas e os participantes.
  const documentos = montarConversasSeed(usuarios.rows as UsuarioSeedConversa[]);
  const cliente = new Client({ node: url, ...(ambiente.OPENSEARCH_USUARIO && ambiente.OPENSEARCH_SENHA
    ? { auth: { username: ambiente.OPENSEARCH_USUARIO, password: ambiente.OPENSEARCH_SENHA } } : {}) });
  try {
    const informacao = await cliente.info();
    if (informacao.body.version?.distribution !== 'opensearch') throw new Error('O destino não é OpenSearch.');
    const indices = [
      { nome: INDICE_CHAT_MENSAGEM, mapeamento: MAPEAMENTO_CHAT_MENSAGEM },
      { nome: INDICE_CHAT_CONVERSA, mapeamento: MAPEAMENTO_CHAT_CONVERSA },
      { nome: INDICE_MENSAGEM_DIRETA, mapeamento: MAPEAMENTO_MENSAGEM_DIRETA },
    ];
    for (const indice of indices) {
      const existe = (await cliente.indices.exists({ index: indice.nome })).body;
      if (limparOpenSearch && existe) await cliente.indices.delete({ index: indice.nome });
      // Os mapas canônicos são independentes do SDK (literais de type inferidos como string).
      if (!existe || limparOpenSearch) await cliente.indices.create({ index: indice.nome, body: indice.mapeamento as API.Indices_Create_RequestBody });
    }
    const resultado = await cliente.bulk({ refresh: 'wait_for', body: documentos.flatMap((documento) => [
      { create: { _index: INDICE_MENSAGEM_DIRETA, _id: documento.mensagem_id } }, documento,
    ]) });
    const falhas = resultado.body.items.filter((item) => item.create?.status !== 201 && item.create?.status !== 409);
    if (falhas.length) throw new Error(`Falha ao gravar ${falhas.length} mensagens do seed; execute novamente para completar.`);
    for (let indice = 0; indice < resultado.body.items.length; indice++) {
      if (resultado.body.items[indice].create?.status !== 409) continue;
      const documento = documentos[indice];
      const existente = await cliente.get({ index: INDICE_MENSAGEM_DIRETA, id: documento.mensagem_id });
      validarMensagemSeedExistente(documento, existente.body._source);
    }
    console.log(`Conversas conferidas: ${new Set(documentos.map((documento) => documento.conversa_id)).size} conversas e ${documentos.length} mensagens fictícias.`);
  } finally {
    await cliente.close();
  }
}

async function principal(): Promise<void> {
  // CLI fora do contexto NestJS, como o knexfile.
  validarDestinoConversas(process.env);
  const limpar = process.argv.includes('--limpar-opensearch');
  if (process.argv.slice(2).some((argumento) => argumento !== '--limpar-opensearch')) throw new Error('Opção desconhecida.');
  const conexao = knex(configuracao);
  try { await semearConversas(conexao, process.env, limpar); }
  finally { await conexao.destroy(); }
}

if (require.main === module) {
  principal().catch((erro) => { console.error((erro as Error).message); process.exitCode = 1; });
}
