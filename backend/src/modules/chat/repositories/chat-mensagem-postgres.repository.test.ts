import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import knex, { Knex } from 'knex';
import { AutorChatEnum, ContextoChatEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { registrarContratoDeArmazenamento } from './armazenamento-de-chat.contrato';
import { ChatMensagemPostgresRepository } from './chat-mensagem-postgres.repository';

let conexao: Knex | null = null;

function conectar(): Knex {
  conexao ??= knex({
    client: 'pg',
    connection: {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5433),
      database: process.env.DB_NOME ?? 'project20',
      user: process.env.DB_USUARIO ?? 'postgres',
      password: process.env.DB_SENHA ?? 'postgres',
    },
    pool: { min: 0, max: 2 },
  });
  return conexao;
}

registrarContratoDeArmazenamento(
  'Postgres',
  async () => new ChatMensagemPostgresRepository(conectar()),
  async (usuarioIds) => {
    await conectar().raw('DELETE FROM chat_mensagem WHERE usuario_id = ANY(?)', [usuarioIds]);
    await conectar().raw('DELETE FROM chat_conversa WHERE usuario_id = ANY(?)', [usuarioIds]);
    await conectar().destroy();
    conexao = null;
  },
);

describe('ChatMensagemPostgresRepository (sem banco)', () => {
  it('banco fora do ar vira a mensagem clara de chat indisponível, sem derrubar o backend', async () => {
    const quebrado = { raw: async () => { throw new Error('connection refused'); } } as unknown as Knex;
    const repositorio = new ChatMensagemPostgresRepository(quebrado);
    const nova = { conversaId: 'x', usuarioId: 1, contexto: ContextoChatEnum.CHAT, autor: AutorChatEnum.USUARIO, texto: 'Oi' };
    await assert.rejects(repositorio.gravar(nova), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.listarConversa({ conversaId: 'x', usuarioId: 1 }), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.buscar({ usuarioId: 1, texto: 'x' }), (erro) => erro instanceof BusinessException);
    assert.deepEqual(await repositorio.listarTitulos({ usuarioId: 1, conversaIds: [] }), {});
  });

  it('não expõe exclusão nem alteração de mensagem', () => {
    const metodos = Object.getOwnPropertyNames(ChatMensagemPostgresRepository.prototype);
    assert.deepEqual(metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)), []);
  });
});
