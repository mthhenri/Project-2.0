import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { MAPEAMENTO_MENSAGEM_DIRETA } from '../domain/mensagem-direta-consultas';
import { MensagemDiretaFonte, MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { registrarContratoDeArmazenamentoDeMensagemDireta } from './armazenamento-de-mensagem-direta.contrato';
import {
  ClienteOpenSearchMensagemDireta,
  MensagemDiretaOpenSearchRepository,
  criarClienteOpenSearchMensagemDireta,
} from './mensagem-direta-opensearch.repository';

const urlDoOpenSearch = process.env.OPENSEARCH_URL ?? 'http://localhost:9200';

registrarContratoDeArmazenamentoDeMensagemDireta(
  'OpenSearch',
  async () => {
    const repositorio = new MensagemDiretaOpenSearchRepository(criarClienteOpenSearchMensagemDireta({ url: urlDoOpenSearch, usuario: undefined, senha: undefined }));
    await repositorio.onModuleInit();
    return repositorio;
  },
  async (usuarioIds) => {
    await fetch(`${urlDoOpenSearch}/mensagem-direta/_delete_by_query?refresh=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { terms: { participantes: usuarioIds } } }),
    });
  },
);

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

function criarClienteFalso(opcoes: { indiceExiste?: boolean; falhar?: boolean; erroNoIndex?: unknown } = {}) {
  const chamadas = {
    exists: 0,
    create: [] as { index: string; body: unknown }[],
    index: [] as { index: string; id: string; body: unknown; refresh: string; op_type: string }[],
    get: [] as { index: string; id: string }[],
    search: [] as { index: string; body: any }[],
  };
  const documentos = new Map<string, MensagemDiretaFonte>();
  const cliente: ClienteOpenSearchMensagemDireta = {
    indices: {
      exists: async () => {
        chamadas.exists++;
        if (opcoes.falhar) throw new Error('connection refused');
        return { body: opcoes.indiceExiste ?? false };
      },
      create: async (parametros) => {
        chamadas.create.push(parametros);
        return {};
      },
    },
    index: async (parametros) => {
      chamadas.index.push(parametros);
      if (opcoes.erroNoIndex) throw opcoes.erroNoIndex;
      // O OpenSearch recusa com 409 o `_id` que já existe quando `op_type` é `create`.
      if (documentos.has(parametros.id)) throw Object.assign(new Error('version_conflict_engine_exception'), { statusCode: 409 });
      documentos.set(parametros.id, parametros.body as MensagemDiretaFonte);
      return {};
    },
    get: async (parametros) => {
      chamadas.get.push(parametros);
      const documento = documentos.get(parametros.id);
      if (!documento) throw Object.assign(new Error('not_found'), { statusCode: 404 });
      return { body: { _source: documento } };
    },
    search: async (parametros) => {
      chamadas.search.push(parametros);
      return { body: { hits: { hits: [...documentos.values()].map((fonte) => ({ _source: fonte })) } } };
    },
  };
  return { cliente, chamadas, documentos };
}

describe('MensagemDiretaOpenSearchRepository', () => {
  it('cria o índice com o mapeamento no corpo, e não recria um que já existe', async () => {
    const novo = criarClienteFalso();
    await new MensagemDiretaOpenSearchRepository(novo.cliente).gravar(nova);
    assert.equal(novo.chamadas.create.length, 1);
    assert.equal(novo.chamadas.create[0].index, 'mensagem-direta');
    assert.deepEqual(novo.chamadas.create[0].body, MAPEAMENTO_MENSAGEM_DIRETA);

    const existente = criarClienteFalso({ indiceExiste: true });
    await new MensagemDiretaOpenSearchRepository(existente.cliente).gravar(nova);
    assert.equal(existente.chamadas.create.length, 0);
  });

  it('grava só se o id ainda não existe (op_type create) e espera o índice atualizar', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const resultado = await new MensagemDiretaOpenSearchRepository(cliente).gravar(nova);
    assert.equal(resultado.jaExistia, false);
    assert.equal(chamadas.index.length, 1);
    assert.equal(chamadas.index[0].id, UUID);
    assert.equal(chamadas.index[0].op_type, 'create');
    assert.equal(chamadas.index[0].refresh, 'wait_for');
    assert.equal((chamadas.index[0].body as MensagemDiretaFonte).conversa_id, '4-9');
    assert.equal(chamadas.get.length, 0);
  });

  it('o 409 do reenvio vira "já existia": lê o documento gravado e o devolve', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const repositorio = new MensagemDiretaOpenSearchRepository(cliente);
    const primeira = await repositorio.gravar(nova);
    const repetida = await repositorio.gravar({ ...nova, texto: 'outro texto' });
    assert.equal(repetida.jaExistia, true);
    assert.equal(repetida.mensagem.texto, 'Oi');
    assert.equal(repetida.mensagem.createdDate.getTime(), primeira.mensagem.createdDate.getTime());
    assert.deepEqual(chamadas.get, [{ index: 'mensagem-direta', id: UUID }]);
  });

  it('reconhece o conflito também pelo formato de erro com `meta`, e um erro que não é 409 não vira "já existia"', async () => {
    const comMeta = criarClienteFalso({ indiceExiste: true, erroNoIndex: { meta: { statusCode: 409 } } });
    comMeta.documentos.set(UUID, { mensagem_id: UUID, conversa_id: '4-9', participantes: [4, 9], autor_usuario_id: 9, autor: 'USUARIO', texto: 'Oi', contem_codigo: false, mencoes: [], referencias: [], created_date: '2026-10-21T14:00:00.000Z' });
    assert.equal((await new MensagemDiretaOpenSearchRepository(comMeta.cliente).gravar(nova)).jaExistia, true);

    const queda = criarClienteFalso({ indiceExiste: true, erroNoIndex: Object.assign(new Error('boom'), { statusCode: 500 }) });
    await assert.rejects(new MensagemDiretaOpenSearchRepository(queda.cliente).gravar(nova), (erro) => erro instanceof BusinessException);
  });

  it('pesquisa lê a resposta no envelope `body`: documentos, baldes de conversa, total e não lidas', async () => {
    const { cliente } = criarClienteFalso({ indiceExiste: true });
    const fonte: MensagemDiretaFonte = { mensagem_id: UUID, conversa_id: '4-9', participantes: [4, 9], autor_usuario_id: 9, autor: 'USUARIO', texto: 'Oi', contem_codigo: false, mencoes: [], referencias: [], created_date: '2026-10-21T14:00:00.000Z' };
    cliente.search = async () => ({
      body: {
        hits: { hits: [] },
        aggregations: {
          conversas: { buckets: [{ key: '4-9', doc_count: 2, ultima_mensagem: { hits: { hits: [{ _source: fonte }] } } }] },
          total: { value: 5 },
          nao_lidas: { buckets: { '4-9': { doc_count: 1 } } },
        },
      },
    });
    const repositorio = new MensagemDiretaOpenSearchRepository(cliente);
    assert.equal((await repositorio.listarConversasDoUsuario({ usuarioId: 9 }))[0].totalMensagens, 2);
    assert.equal((await repositorio.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 1, porPagina: 10 })).total, 5);
    assert.deepEqual(await repositorio.contarNaoLidas({ usuarioId: 9, marcadores: [{ conversaId: '4-9', lidaAteDate: null }] }), { '4-9': 1 });
  });

  it('envia a consulta no corpo (`body`) da pesquisa', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    await new MensagemDiretaOpenSearchRepository(cliente).buscar({ usuarioId: 9, texto: 'filtro' });
    assert.equal(chamadas.search[0].index, 'mensagem-direta');
    assert.deepEqual(chamadas.search[0].body.query.bool.filter, [{ term: { participantes: 9 } }]);
  });

  it('OpenSearch fora do ar vira mensagem clara e não derruba a subida', async () => {
    const { cliente } = criarClienteFalso({ falhar: true });
    const repositorio = new MensagemDiretaOpenSearchRepository(cliente);
    await assert.doesNotReject(repositorio.onModuleInit());
    await assert.rejects(repositorio.gravar(nova), (erro) => erro instanceof BusinessException);
    await assert.rejects(repositorio.listarConversasDoUsuario({ usuarioId: 9 }), (erro) => erro instanceof BusinessException);
  });

  it('não expõe exclusão nem alteração de documento', () => {
    const metodos = [MensagemDiretaOpenSearchRepository.prototype, Object.getPrototypeOf(MensagemDiretaOpenSearchRepository.prototype)].flatMap((prototipo) => Object.getOwnPropertyNames(prototipo));
    assert.deepEqual(
      metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)),
      [],
    );
  });
});
