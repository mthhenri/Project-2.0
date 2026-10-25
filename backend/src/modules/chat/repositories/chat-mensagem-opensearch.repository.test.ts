import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ChatMensagemFonte, ChatMensagemNova } from '../domain/chat-mensagem.documento';
import { registrarContratoDeArmazenamento } from './armazenamento-de-chat.contrato';
import { ChatMensagemOpenSearchRepository, ClienteOpenSearchChat, criarClienteOpenSearchChat } from './chat-mensagem-opensearch.repository';

const nova: ChatMensagemNova = {
  conversaId: '7-2026-10-17',
  usuarioId: 7,
  contexto: ContextoChatEnum.CHAT,
  autor: AutorChatEnum.USUARIO,
  texto: 'Oi',
};

function criarClienteFalso(opcoes: { indiceExiste?: boolean; falhar?: boolean; corridaNoCreate?: boolean } = {}) {
  const chamadas = { exists: 0, create: 0, putMapping: [] as { index: string; body: unknown }[], index: [] as { id: string; refresh: string }[] };
  const documentos: ChatMensagemFonte[] = [];
  const cliente: ClienteOpenSearchChat = {
    indices: {
      exists: async () => {
        chamadas.exists++;
        if (opcoes.falhar) throw new Error('connection refused');
        return { body: opcoes.indiceExiste ?? false };
      },
      create: async () => {
        chamadas.create++;
        if (opcoes.corridaNoCreate) throw { body: { error: { type: 'resource_already_exists_exception' } } };
        return {};
      },
      putMapping: async (parametros) => {
        chamadas.putMapping.push(parametros);
        return {};
      },
    },
    index: async (parametros) => {
      chamadas.index.push({ id: parametros.id, refresh: parametros.refresh });
      documentos.push(parametros.body as ChatMensagemFonte);
      return {};
    },
    search: async () => ({ body: { hits: { hits: documentos.map((fonte) => ({ _source: fonte })) } } }),
  };
  return { cliente, chamadas };
}

const urlDoOpenSearch = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';

registrarContratoDeArmazenamento(
  'OpenSearch',
  async () => {
    const repositorio = new ChatMensagemOpenSearchRepository(criarClienteOpenSearchChat({ url: urlDoOpenSearch, usuario: undefined, senha: undefined }));
    await repositorio.onModuleInit();
    return repositorio;
  },
  async (usuarioIds) => {
    for (const indice of ['chat-mensagem', 'chat-conversa']) {
      await fetch(`${urlDoOpenSearch}/${indice}/_delete_by_query?refresh=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: { terms: { usuario_id: usuarioIds } } }),
      });
    }
  },
);

describe('ChatMensagemOpenSearchRepository', () => {
  it('cria o índice uma única vez, mesmo com várias chamadas', async () => {
    const { cliente, chamadas } = criarClienteFalso();
    const repositorio = new ChatMensagemOpenSearchRepository(cliente);
    await repositorio.gravar(nova);
    await repositorio.gravar(nova);
    assert.equal(chamadas.create, 2);
    assert.equal(chamadas.exists, 2);
  });

  it('um índice que já existe ganha os campos posteriores (`assunto` e `propostas_ids`) sem ser recriado', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    await new ChatMensagemOpenSearchRepository(cliente).gravar(nova);
    assert.equal(chamadas.create, 0);
    assert.deepEqual(chamadas.putMapping, [{ index: 'chat-mensagem', body: { properties: { assunto: { type: 'keyword' }, propostas_ids: { type: 'integer' } } } }]);
  });

  it('não recria um índice que já existe', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    await new ChatMensagemOpenSearchRepository(cliente).gravar(nova);
    assert.equal(chamadas.create, 0);
  });

  it('tolera outra instância criando o índice ao mesmo tempo', async () => {
    const { cliente } = criarClienteFalso({ corridaNoCreate: true });
    await assert.doesNotReject(new ChatMensagemOpenSearchRepository(cliente).gravar(nova));
  });

  it('grava com identificador próprio e espera o índice atualizar (a leitura seguinte já vê a mensagem)', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const repositorio = new ChatMensagemOpenSearchRepository(cliente);
    const gravada = await repositorio.gravar(nova);
    assert.equal(chamadas.index.length, 1);
    assert.equal(chamadas.index[0].id, gravada.id);
    assert.equal(chamadas.index[0].refresh, 'wait_for');
    const conversa = await repositorio.listarConversa({ conversaId: nova.conversaId, usuarioId: 7 });
    assert.equal(conversa.length, 1);
    assert.equal(conversa[0].texto, 'Oi');
  });

  it('OpenSearch fora do ar vira mensagem clara e não derruba a subida', async () => {
    const { cliente } = criarClienteFalso({ falhar: true });
    const repositorio = new ChatMensagemOpenSearchRepository(cliente);
    await assert.doesNotReject(repositorio.onModuleInit());
    await assert.rejects(repositorio.gravar(nova), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.listarConversa({ conversaId: 'x', usuarioId: 1 }), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.buscar({ usuarioId: 1, texto: 'x' }), (erro) => erro instanceof BusinessException);
  });

  it('somarTokens lê os baldes da agregação `periodos` (resposta no envelope `body`)', async () => {
    const { cliente } = criarClienteFalso({ indiceExiste: true });
    const agregacao = { key_as_string: '2026-10-05', modelos: { buckets: [{ key: 'haiku', doc_count: 1, entrada: { value: 9 }, saida: { value: 1 }, cache: { value: 0 } }] } };
    cliente.search = async () => ({ body: { hits: { hits: [] }, aggregations: { periodos: { buckets: [agregacao] } } } });
    const somados = await new ChatMensagemOpenSearchRepository(cliente).somarTokens({ dataInicio: '2026-10-01', dataFim: '2026-10-31', porMes: false, fusoHorario: 'UTC' });
    assert.deepEqual(somados, [{ periodo: '2026-10-05', modelo: 'haiku', mensagens: 1, tokensEntrada: 9, tokensSaida: 1, tokensCache: 0 }]);
  });

  it('não expõe exclusão nem alteração de documento', () => {
    const metodos = [ChatMensagemOpenSearchRepository.prototype, Object.getPrototypeOf(ChatMensagemOpenSearchRepository.prototype)].flatMap((prototipo) => Object.getOwnPropertyNames(prototipo));
    assert.deepEqual(
      metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)),
      [],
    );
  });
});
