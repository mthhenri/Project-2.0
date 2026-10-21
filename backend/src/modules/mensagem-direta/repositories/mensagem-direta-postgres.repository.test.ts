import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Knex } from 'knex';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { codificarCursor } from '../domain/mensagem-direta-consultas';
import { MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { MensagemDiretaPostgresRepository } from './mensagem-direta-postgres.repository';

// A suíte de contrato desse armazenamento roda contra o banco de teste em `mensagem-direta-postgres.repository.integracao.test.ts`.
// Aqui fica o que não precisa de banco: recusar o que é inválido antes de consultar e traduzir a falha do banco.

const UUID = '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10';
const nova: MensagemDiretaNova = {
  mensagemId: UUID,
  conversaId: '4-9',
  autor: AutorMensagemDiretaEnum.USUARIO,
  autorUsuarioId: 9,
  texto: 'Oi',
  contemCodigo: false,
  mencoes: [],
  referencias: [],
};

function criarConexaoFalsa(falha?: Error) {
  const consultas: unknown[] = [];
  const conexao = {
    raw: async (sql: string) => {
      consultas.push(sql);
      if (falha) throw falha;
      return { rows: [] };
    },
  } as unknown as Knex;
  return { repositorio: new MensagemDiretaPostgresRepository(conexao), consultas };
}

const recusa = (promessa: Promise<unknown>) => assert.rejects(promessa, (erro) => erro instanceof BusinessException);

describe('MensagemDiretaPostgresRepository (sem banco)', () => {
  it('recusa o inválido antes de consultar o banco', async () => {
    const { repositorio, consultas } = criarConexaoFalsa();
    await recusa(repositorio.gravar({ ...nova, conversaId: '9-4' }));
    await recusa(repositorio.gravar({ ...nova, mensagemId: 'nao-e-uuid' }));
    await recusa(repositorio.listarConversa({ conversaId: '9-4', limite: 10 }));
    await recusa(repositorio.listarConversa({ conversaId: '4-9', limite: 101 }));
    await recusa(repositorio.listarConversa({ conversaId: '4-9', limite: 10, cursor: 'lixo' }));
    await recusa(repositorio.buscar({ usuarioId: 9, texto: '  ' }));
    await recusa(repositorio.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 0, porPagina: 10 }));
    assert.deepEqual(consultas, []);
  });

  it('um cursor bem formado mas com `mensagem_id` que não é UUID ou data impossível vira erro de negócio, não falha do banco', async () => {
    const { repositorio, consultas } = criarConexaoFalsa();
    const comIdInvalido = codificarCursor({ mensagem_id: 'nao-e-uuid', created_date: '2026-10-21T14:00:00.000Z' });
    await recusa(repositorio.listarConversa({ conversaId: '4-9', limite: 10, cursor: comIdInvalido }));
    const comDataImpossivel = Buffer.from(JSON.stringify([8.64e15 + 1, UUID]), 'utf8').toString('base64url');
    await recusa(repositorio.listarConversa({ conversaId: '4-9', limite: 10, cursor: comDataImpossivel }));
    assert.deepEqual(consultas, []);
  });

  it('não consulta o banco para contar as não lidas de nenhuma conversa', async () => {
    const { repositorio, consultas } = criarConexaoFalsa();
    assert.deepEqual(await repositorio.contarNaoLidas({ usuarioId: 9, marcadores: [] }), {});
    assert.deepEqual(consultas, []);
  });

  it('banco fora do ar vira a mensagem clara de chat indisponível, sem derrubar o backend', async () => {
    const { repositorio } = criarConexaoFalsa(new Error('connection refused'));
    await recusa(repositorio.gravar(nova));
    await recusa(repositorio.listarConversa({ conversaId: '4-9', limite: 10 }));
    await recusa(repositorio.listarConversasDoUsuario({ usuarioId: 9 }));
    await recusa(repositorio.contarNaoLidas({ usuarioId: 9, marcadores: [{ conversaId: '4-9', lidaAteDate: null }] }));
    await recusa(repositorio.buscar({ usuarioId: 9, texto: 'filtro' }));
    await recusa(repositorio.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 1, porPagina: 10 }));
  });

  it('não expõe exclusão nem alteração de mensagem', () => {
    // Só os métodos do próprio repository: o `executarSoftDelete` herdado de `BaseRepository` existe, mas este não o usa.
    const metodos = Object.getOwnPropertyNames(MensagemDiretaPostgresRepository.prototype);
    assert.deepEqual(metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)), []);
  });
});
