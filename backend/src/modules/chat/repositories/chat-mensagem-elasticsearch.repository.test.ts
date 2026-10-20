import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ChatMensagemFonte, ChatMensagemNova } from '../domain/chat-mensagem.documento';
import { registrarContratoDeArmazenamento } from './armazenamento-de-chat.contrato';
import { ChatMensagemElasticsearchRepository, ClienteElasticsearchChat, criarClienteElasticsearchChat } from './chat-mensagem-elasticsearch.repository';

const urlDoElasticsearch = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9201';

registrarContratoDeArmazenamento(
  'Elasticsearch',
  async () => {
    const repositorio = new ChatMensagemElasticsearchRepository(criarClienteElasticsearchChat({ url: urlDoElasticsearch, usuario: undefined, senha: undefined, apiKey: undefined }));
    await repositorio.onModuleInit();
    return repositorio;
  },
  async (usuarioIds) => {
    for (const indice of ['chat-mensagem', 'chat-conversa']) {
      await fetch(`${urlDoElasticsearch}/${indice}/_delete_by_query?refresh=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: { terms: { usuario_id: usuarioIds } } }),
      });
    }
  },
);

const nova: ChatMensagemNova = { conversaId: '7-2026-10-17', usuarioId: 7, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'Oi' };

function criarClienteFalso(opcoes: { indiceExiste?: boolean; falhar?: boolean; corridaNoCreate?: boolean } = {}) {
  const chamadas = { exists: 0, create: [] as Record<string, unknown>[], putMapping: [] as Record<string, unknown>[], index: [] as { id: string; refresh: string }[], search: [] as Record<string, unknown>[] };
  const documentos: ChatMensagemFonte[] = [];
  const cliente: ClienteElasticsearchChat = {
    indices: {
      exists: async () => {
        chamadas.exists++;
        if (opcoes.falhar) throw new Error('connection refused');
        return opcoes.indiceExiste ?? false;
      },
      create: async (parametros) => {
        chamadas.create.push(parametros);
        if (opcoes.corridaNoCreate) throw { meta: { body: { error: { type: 'resource_already_exists_exception' } } } };
        return {};
      },
      putMapping: async (parametros) => {
        chamadas.putMapping.push(parametros);
        return {};
      },
    },
    index: async (parametros) => {
      chamadas.index.push({ id: parametros.id, refresh: parametros.refresh });
      documentos.push(parametros.document as ChatMensagemFonte);
      return {};
    },
    search: async (parametros) => {
      chamadas.search.push(parametros);
      return { hits: { hits: documentos.map((fonte) => ({ _source: fonte })) } };
    },
  };
  return { cliente, chamadas };
}

describe('ChatMensagemElasticsearchRepository', () => {
  it('cria os dois índices com o mapeamento espalhado nos parâmetros (settings e mappings), só quando não existem', async () => {
    const { cliente, chamadas } = criarClienteFalso();
    await new ChatMensagemElasticsearchRepository(cliente).gravar(nova);
    assert.deepEqual(chamadas.create.map((parametros) => parametros.index), ['chat-mensagem', 'chat-conversa']);
    assert.ok('settings' in chamadas.create[0] && 'mappings' in chamadas.create[0]);
    const existente = criarClienteFalso({ indiceExiste: true });
    await new ChatMensagemElasticsearchRepository(existente.cliente).gravar(nova);
    assert.equal(existente.chamadas.create.length, 0);
  });

  it('um índice que já existe ganha o campo `assunto` (keyword) sem ser recriado', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    await new ChatMensagemElasticsearchRepository(cliente).gravar(nova);
    assert.equal(chamadas.create.length, 0);
    assert.deepEqual(chamadas.putMapping, [{ index: 'chat-mensagem', properties: { assunto: { type: 'keyword' } } }]);
  });

  it('tolera outra instância criando o índice ao mesmo tempo', async () => {
    const { cliente } = criarClienteFalso({ corridaNoCreate: true });
    await assert.doesNotReject(new ChatMensagemElasticsearchRepository(cliente).gravar(nova));
  });

  it('grava o documento com identificador próprio, espera o refresh e lê pela pesquisa com o corpo espalhado', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const repositorio = new ChatMensagemElasticsearchRepository(cliente);
    const gravada = await repositorio.gravar(nova);
    assert.equal(chamadas.index[0].id, gravada.id);
    assert.equal(chamadas.index[0].refresh, 'wait_for');
    const conversa = await repositorio.listarConversa({ conversaId: nova.conversaId, usuarioId: 7 });
    assert.equal(conversa[0].texto, 'Oi');
    assert.equal(chamadas.search[0].index, 'chat-mensagem');
    assert.ok('query' in chamadas.search[0] && 'sort' in chamadas.search[0] && !('body' in chamadas.search[0]));
  });

  it('somarTokens espalha a consulta nos parâmetros e lê os baldes da agregação `periodos` (resposta sem envelope)', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const agregacao = { key_as_string: '2026-10', modelos: { buckets: [{ key: 'sonnet', doc_count: 2, entrada: { value: 50 }, saida: { value: 6 }, cache: { value: 1 } }] } };
    cliente.search = async (parametros) => {
      chamadas.search.push(parametros);
      return { hits: { hits: [] }, aggregations: { periodos: { buckets: [agregacao] } } };
    };
    const somados = await new ChatMensagemElasticsearchRepository(cliente).somarTokens({ dataInicio: '2026-01-01', dataFim: '2026-12-31', porMes: true, fusoHorario: 'UTC' });
    assert.deepEqual(somados, [{ periodo: '2026-10', modelo: 'sonnet', mensagens: 2, tokensEntrada: 50, tokensSaida: 6, tokensCache: 1 }]);
    assert.ok('aggs' in chamadas.search[0] && 'query' in chamadas.search[0] && !('body' in chamadas.search[0]));
  });

  it('Elasticsearch fora do ar vira mensagem clara e não derruba a subida', async () => {
    const repositorio = new ChatMensagemElasticsearchRepository(criarClienteFalso({ falhar: true }).cliente);
    await assert.doesNotReject(repositorio.onModuleInit());
    await assert.rejects(repositorio.gravar(nova), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.buscar({ usuarioId: 1, texto: 'x' }), (erro) => erro instanceof BusinessException);
  });

  it('o cliente real aceita chave de API, usuário e senha ou nenhuma autenticação', () => {
    for (const configuracao of [
      { url: 'http://localhost:9201', usuario: undefined, senha: undefined, apiKey: 'chave' },
      { url: 'http://localhost:9201', usuario: 'elastic', senha: 'senha', apiKey: undefined },
      { url: 'http://localhost:9201', usuario: undefined, senha: undefined, apiKey: undefined },
    ]) {
      assert.ok(criarClienteElasticsearchChat(configuracao));
    }
  });
});
