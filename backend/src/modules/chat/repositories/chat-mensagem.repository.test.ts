import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorChatEnum, ContextoChatEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ChatMensagemFonte, ChatMensagemNova } from '../domain/chat-mensagem.documento';
import { ChatMensagemRepository, ClienteOpenSearchChat } from './chat-mensagem.repository';

const nova: ChatMensagemNova = {
  conversaId: '7-2026-10-17',
  usuarioId: 7,
  contexto: ContextoChatEnum.CHAT,
  autor: AutorChatEnum.USUARIO,
  texto: 'Oi',
};

function criarClienteFalso(opcoes: { indiceExiste?: boolean; falhar?: boolean; corridaNoCreate?: boolean } = {}) {
  const chamadas = { exists: 0, create: 0, index: [] as { id: string; refresh: string }[] };
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

describe('ChatMensagemRepository', () => {
  it('cria o índice uma única vez, mesmo com várias chamadas', async () => {
    const { cliente, chamadas } = criarClienteFalso();
    const repositorio = new ChatMensagemRepository(cliente);
    await repositorio.gravar(nova);
    await repositorio.gravar(nova);
    assert.equal(chamadas.create, 1);
    assert.equal(chamadas.exists, 1);
  });

  it('não recria um índice que já existe', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    await new ChatMensagemRepository(cliente).gravar(nova);
    assert.equal(chamadas.create, 0);
  });

  it('tolera outra instância criando o índice ao mesmo tempo', async () => {
    const { cliente } = criarClienteFalso({ corridaNoCreate: true });
    await assert.doesNotReject(new ChatMensagemRepository(cliente).gravar(nova));
  });

  it('grava com identificador próprio e espera o índice atualizar (a leitura seguinte já vê a mensagem)', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const repositorio = new ChatMensagemRepository(cliente);
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
    const repositorio = new ChatMensagemRepository(cliente);
    await assert.doesNotReject(repositorio.onModuleInit());
    await assert.rejects(repositorio.gravar(nova), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.listarConversa({ conversaId: 'x', usuarioId: 1 }), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.buscar({ usuarioId: 1, texto: 'x' }), (erro) => erro instanceof BusinessException);
  });

  it('não expõe exclusão nem alteração de documento', () => {
    const metodos = Object.getOwnPropertyNames(ChatMensagemRepository.prototype);
    assert.deepEqual(
      metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)),
      [],
    );
  });
});
