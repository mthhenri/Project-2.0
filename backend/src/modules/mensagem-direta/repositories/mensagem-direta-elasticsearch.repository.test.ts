import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { MAPEAMENTO_MENSAGEM_DIRETA } from '../domain/mensagem-direta-consultas';
import { MensagemDiretaFonte, MensagemDiretaNova } from '../domain/mensagem-direta.documento';
import { registrarContratoDeArmazenamentoDeMensagemDireta } from './armazenamento-de-mensagem-direta.contrato';
import {
  ClienteElasticsearchMensagemDireta,
  MensagemDiretaElasticsearchRepository,
  criarClienteElasticsearchMensagemDireta,
} from './mensagem-direta-elasticsearch.repository';

const urlDoElasticsearch = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9201';

registrarContratoDeArmazenamentoDeMensagemDireta(
  'Elasticsearch',
  async () => {
    const repositorio = new MensagemDiretaElasticsearchRepository(
      criarClienteElasticsearchMensagemDireta({ url: urlDoElasticsearch, usuario: undefined, senha: undefined, apiKey: undefined }),
    );
    await repositorio.onModuleInit();
    return repositorio;
  },
  async (usuarioIds) => {
    await fetch(`${urlDoElasticsearch}/mensagem-direta/_delete_by_query?refresh=true`, {
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

const FONTE: MensagemDiretaFonte = {
  mensagem_id: UUID,
  conversa_id: '4-9',
  participantes: [4, 9],
  autor_usuario_id: 9,
  autor: 'USUARIO',
  texto: 'Oi',
  contem_codigo: false,
  mencoes: [],
  referencias: [],
  created_date: '2026-10-21T14:00:00.000Z',
};

function criarClienteFalso(opcoes: { indiceExiste?: boolean; falhar?: boolean; erroNoIndex?: unknown } = {}) {
  const chamadas = {
    exists: 0,
    create: [] as Record<string, unknown>[],
    index: [] as { index: string; id: string; document: unknown; refresh: string; op_type: string }[],
    get: [] as { index: string; id: string }[],
    search: [] as Record<string, unknown>[],
  };
  const documentos = new Map<string, MensagemDiretaFonte>();
  const cliente: ClienteElasticsearchMensagemDireta = {
    indices: {
      exists: async () => {
        chamadas.exists++;
        if (opcoes.falhar) throw new Error('connection refused');
        return opcoes.indiceExiste ?? false;
      },
      create: async (parametros) => {
        chamadas.create.push(parametros);
        return {};
      },
    },
    index: async (parametros) => {
      chamadas.index.push(parametros);
      if (opcoes.erroNoIndex) throw opcoes.erroNoIndex;
      // O Elasticsearch recusa com 409 (`meta.statusCode`) o `_id` que já existe quando `op_type` é `create`.
      if (documentos.has(parametros.id)) throw Object.assign(new Error('version_conflict_engine_exception'), { meta: { statusCode: 409 } });
      documentos.set(parametros.id, parametros.document as MensagemDiretaFonte);
      return {};
    },
    get: async (parametros) => {
      chamadas.get.push(parametros);
      const documento = documentos.get(parametros.id);
      if (!documento) throw Object.assign(new Error('not_found'), { meta: { statusCode: 404 } });
      return { _source: documento };
    },
    search: async (parametros) => {
      chamadas.search.push(parametros);
      return { hits: { hits: [...documentos.values()].map((fonte) => ({ _source: fonte })) } };
    },
  };
  return { cliente, chamadas, documentos };
}

describe('MensagemDiretaElasticsearchRepository', () => {
  it('cria o índice com o mapeamento espalhado nos parâmetros, e não recria um que já existe', async () => {
    const novo = criarClienteFalso();
    await new MensagemDiretaElasticsearchRepository(novo.cliente).gravar(nova);
    assert.equal(novo.chamadas.create.length, 1);
    assert.deepEqual(novo.chamadas.create[0], { index: 'mensagem-direta', ...MAPEAMENTO_MENSAGEM_DIRETA });

    const existente = criarClienteFalso({ indiceExiste: true });
    await new MensagemDiretaElasticsearchRepository(existente.cliente).gravar(nova);
    assert.equal(existente.chamadas.create.length, 0);
  });

  it('grava só se o id ainda não existe (op_type create), com `document`, e espera o índice atualizar', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const resultado = await new MensagemDiretaElasticsearchRepository(cliente).gravar(nova);
    assert.equal(resultado.jaExistia, false);
    assert.equal(chamadas.index.length, 1);
    assert.equal(chamadas.index[0].id, UUID);
    assert.equal(chamadas.index[0].op_type, 'create');
    assert.equal(chamadas.index[0].refresh, 'wait_for');
    assert.equal((chamadas.index[0].document as MensagemDiretaFonte).conversa_id, '4-9');
  });

  it('o 409 do reenvio (em `meta.statusCode`) vira "já existia": lê o documento gravado e o devolve', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    const repositorio = new MensagemDiretaElasticsearchRepository(cliente);
    await repositorio.gravar(nova);
    const repetida = await repositorio.gravar({ ...nova, texto: 'outro texto' });
    assert.equal(repetida.jaExistia, true);
    assert.equal(repetida.mensagem.texto, 'Oi');
    assert.deepEqual(chamadas.get, [{ index: 'mensagem-direta', id: UUID }]);
  });

  it('um erro que não é 409 não vira "já existia"', async () => {
    const queda = criarClienteFalso({ indiceExiste: true, erroNoIndex: Object.assign(new Error('boom'), { meta: { statusCode: 503 } }) });
    await assert.rejects(new MensagemDiretaElasticsearchRepository(queda.cliente).gravar(nova), (erro) => erro instanceof BusinessException);
  });

  it('pesquisa lê a resposta direto (sem `body`): documentos, baldes de conversa, total e não lidas', async () => {
    const { cliente } = criarClienteFalso({ indiceExiste: true });
    cliente.search = async () => ({
      hits: { hits: [{ _source: FONTE }, {}] },
      aggregations: {
        conversas: { buckets: [{ key: '4-9', doc_count: 2, ultima_mensagem: { hits: { hits: [{ _source: FONTE }] } } }] },
        total: { value: 5 },
        nao_lidas: { buckets: { '4-9': { doc_count: 1 } } },
      },
    });
    const repositorio = new MensagemDiretaElasticsearchRepository(cliente);
    assert.equal((await repositorio.buscar({ usuarioId: 9, texto: 'oi' })).length, 1, 'acerto sem `_source` é ignorado');
    assert.equal((await repositorio.listarConversasDoUsuario({ usuarioId: 9 }))[0].totalMensagens, 2);
    assert.equal((await repositorio.listarTodasConversas({ usuarioIdsExcluidos: [], pagina: 1, porPagina: 10 })).total, 5);
    assert.deepEqual(await repositorio.contarNaoLidas({ usuarioId: 9, marcadores: [{ conversaId: '4-9', lidaAteDate: null }] }), { '4-9': 1 });
  });

  it('espalha a consulta nos parâmetros da pesquisa', async () => {
    const { cliente, chamadas } = criarClienteFalso({ indiceExiste: true });
    await new MensagemDiretaElasticsearchRepository(cliente).buscar({ usuarioId: 9, texto: 'filtro' });
    assert.equal(chamadas.search[0].index, 'mensagem-direta');
    assert.deepEqual((chamadas.search[0].query as any).bool.filter, [{ term: { participantes: 9 } }]);
  });

  it('Elasticsearch fora do ar vira mensagem clara e não derruba a subida', async () => {
    const { cliente } = criarClienteFalso({ falhar: true });
    const repositorio = new MensagemDiretaElasticsearchRepository(cliente);
    await assert.doesNotReject(repositorio.onModuleInit());
    await assert.rejects(repositorio.gravar(nova), (erro) => erro instanceof BusinessException);
  });

  it('não expõe exclusão nem alteração de documento', () => {
    const metodos = [MensagemDiretaElasticsearchRepository.prototype, Object.getPrototypeOf(MensagemDiretaElasticsearchRepository.prototype)].flatMap((prototipo) => Object.getOwnPropertyNames(prototipo));
    assert.deepEqual(
      metodos.filter((nome) => /exclu|delet|remov|apag|alter|atualiz|update/i.test(nome)),
      [],
    );
  });
});
