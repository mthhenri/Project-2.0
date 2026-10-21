import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { MAPEAMENTO_CHAT_MENSAGEM } from '../../chat/domain/chat-consultas';
import {
  BaldeConversaDireta,
  LIMITE_BUSCA_DIRETA,
  LIMITE_CONVERSAS_DA_SUPERVISAO,
  LIMITE_CONVERSAS_DO_USUARIO,
  MAPEAMENTO_MENSAGEM_DIRETA,
  codificarCursor,
  deBaldesDeConversas,
  deBaldesDeNaoLidas,
  decodificarCursor,
  montarConsultaBuscaDireta,
  montarConsultaConversaDireta,
  montarConsultaConversasDoUsuario,
  montarConsultaNaoLidas,
  montarConsultaSupervisao,
} from './mensagem-direta-consultas';
import { deFonteDireta, MensagemDiretaFonte } from './mensagem-direta.documento';

const FONTE: MensagemDiretaFonte = {
  mensagem_id: '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10',
  conversa_id: '4-9',
  participantes: [4, 9],
  autor_usuario_id: 9,
  autor: 'USUARIO',
  texto: 'Oi',
  contem_codigo: false,
  mencoes: [],
  referencias: [],
  created_date: '2026-10-21T14:05:11.482Z',
};

const mensagemDe = (erro: unknown): string => ((erro as BusinessException).getResponse() as { mensagem: string }).mensagem;
const recusaCom = (acao: () => unknown, trecho: RegExp) => assert.throws(acao, (erro) => erro instanceof BusinessException && trecho.test(mensagemDe(erro)));

test('o mapeamento guarda os campos da modelagem e reaproveita o analisador de português sem acento do chat da IA', () => {
  const propriedades = MAPEAMENTO_MENSAGEM_DIRETA.mappings.properties;
  assert.deepEqual(Object.keys(propriedades).sort(), [
    'autor', 'autor_usuario_id', 'contem_codigo', 'conversa_id', 'created_date', 'mencoes', 'mensagem_id', 'participantes', 'referencias', 'texto',
  ]);
  assert.deepEqual(propriedades.texto, { type: 'text', analyzer: 'texto_pt' });
  assert.equal(propriedades.created_date.type, 'date');
  assert.equal(propriedades.participantes.type, 'integer');
  assert.deepEqual(MAPEAMENTO_MENSAGEM_DIRETA.settings, MAPEAMENTO_CHAT_MENSAGEM.settings);
});

// --- cursor ----------------------------------------------------------------

test('o cursor leva o instante em milissegundos e o id, e volta igual', () => {
  const cursor = codificarCursor(FONTE);
  assert.match(cursor, /^[A-Za-z0-9_-]+$/, 'seguro em URL');
  assert.deepEqual(decodificarCursor(cursor), [new Date(FONTE.created_date).getTime(), FONTE.mensagem_id]);
});

test('cursor adulterado, vazio ou de outro formato é recusado', () => {
  for (const invalido of ['', 'não é base64', Buffer.from('[1]').toString('base64url'), Buffer.from('["a","b"]').toString('base64url'), Buffer.from('[1,""]').toString('base64url'), Buffer.from('{"a":1}').toString('base64url'), Buffer.from('[1,2]').toString('base64url')]) {
    recusaCom(() => decodificarCursor(invalido), /Cursor da conversa inválido/);
  }
});

// --- conversa ---------------------------------------------------------------

test('a página da conversa pede um a mais que o limite, da mais nova para a mais antiga, sem filtrar por pessoa', () => {
  const consulta = montarConsultaConversaDireta({ conversaId: '4-9', limite: 50 });
  assert.equal(consulta.size, 51);
  assert.deepEqual(consulta.query, { bool: { filter: [{ term: { conversa_id: '4-9' } }] } });
  assert.deepEqual(consulta.sort, [{ created_date: 'desc' }, { mensagem_id: 'desc' }]);
  assert.equal('search_after' in consulta, false);
});

test('com cursor a página continua do ponto exato (search_after com os dois valores de ordenação)', () => {
  const cursor = codificarCursor(FONTE);
  const consulta = montarConsultaConversaDireta({ conversaId: '4-9', limite: 20, cursor });
  assert.deepEqual((consulta as { search_after?: unknown }).search_after, [new Date(FONTE.created_date).getTime(), FONTE.mensagem_id]);
  recusaCom(() => montarConsultaConversaDireta({ conversaId: '4-9', limite: 20, cursor: 'lixo' }), /Cursor/);
});

// --- lista de conversas -----------------------------------------------------

test('a lista de conversas filtra pela pessoa e agrega por conversa, da mais recente, com a última mensagem', () => {
  const consulta = montarConsultaConversasDoUsuario({ usuarioId: 9 });
  assert.equal(consulta.size, 0);
  assert.deepEqual(consulta.query, { bool: { filter: [{ term: { participantes: 9 } }] } });
  const agregacao = consulta.aggs.conversas;
  assert.deepEqual(agregacao.terms, { field: 'conversa_id', size: LIMITE_CONVERSAS_DO_USUARIO, order: { ultima: 'desc' } });
  assert.deepEqual(agregacao.aggs.ultima, { max: { field: 'created_date' } });
  assert.deepEqual(agregacao.aggs.ultima_mensagem, { top_hits: { size: 1, sort: [{ created_date: 'desc' }, { mensagem_id: 'desc' }] } });
  assert.equal('pagina' in agregacao.aggs, false);
});

test('os baldes viram uma linha por conversa; balde sem a última mensagem é ignorado', () => {
  const baldes = [
    { key: '4-9', doc_count: 3, ultima_mensagem: { hits: { hits: [{ _source: FONTE }] } } },
    { key: '4-12', doc_count: 1, ultima_mensagem: { hits: { hits: [] } } },
  ] as BaldeConversaDireta[];
  const linhas = deBaldesDeConversas(baldes, deFonteDireta);
  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].conversaId, '4-9');
  assert.deepEqual(linhas[0].participantes, [4, 9]);
  assert.equal(linhas[0].totalMensagens, 3);
  assert.equal(linhas[0].ultimaMensagem.texto, 'Oi');
});

// --- não lidas --------------------------------------------------------------

test('as não lidas contam só mensagem de pessoa que não é a minha, num balde por conversa', () => {
  const lidaAte = new Date('2026-10-21T14:00:00.000Z');
  const consulta = montarConsultaNaoLidas({
    usuarioId: 9,
    marcadores: [
      { conversaId: '4-9', lidaAteDate: lidaAte },
      { conversaId: '9-12', lidaAteDate: null },
    ],
  });
  assert.equal(consulta.size, 0);
  assert.deepEqual(consulta.query, {
    bool: {
      filter: [{ term: { participantes: 9 } }, { term: { autor: AutorMensagemDiretaEnum.USUARIO } }],
      must_not: [{ term: { autor_usuario_id: 9 } }],
    },
  });
  assert.deepEqual(consulta.aggs.nao_lidas.filters.filters, {
    '4-9': { bool: { filter: [{ term: { conversa_id: '4-9' } }, { range: { created_date: { gt: '2026-10-21T14:00:00.000Z' } } }] } },
    '9-12': { bool: { filter: [{ term: { conversa_id: '9-12' } }] } },
  });
});

test('toda conversa pedida aparece no resultado das não lidas, com zero quando o balde falta', () => {
  assert.deepEqual(deBaldesDeNaoLidas(['4-9', '9-12', '9-30'], { '4-9': { doc_count: 2 }, '9-12': { doc_count: 0 } }), { '4-9': 2, '9-12': 0, '9-30': 0 });
  assert.deepEqual(deBaldesDeNaoLidas(['4-9'], undefined), { '4-9': 0 });
});

// --- busca ------------------------------------------------------------------

test('a busca é restrita às conversas da pessoa, casa todas as palavras e ordena pelas mais relevantes', () => {
  const consulta = montarConsultaBuscaDireta({ usuarioId: 9, texto: 'filtro execuções' });
  assert.equal(consulta.size, LIMITE_BUSCA_DIRETA);
  assert.deepEqual(consulta.query.bool.filter, [{ term: { participantes: 9 } }]);
  assert.deepEqual(consulta.query.bool.must, [{ match: { texto: { query: 'filtro execuções', operator: 'and' } } }]);
  assert.deepEqual(consulta.sort, [{ _score: 'desc' }, { created_date: 'desc' }, { mensagem_id: 'desc' }]);
});

test('a busca acrescenta o período (só o limite informado) e o filtro de código', () => {
  const inicio = new Date('2026-10-01T00:00:00.000Z');
  const fim = new Date('2026-10-21T00:00:00.000Z');
  assert.deepEqual(montarConsultaBuscaDireta({ usuarioId: 9, texto: 'a', inicio, fim, somenteCodigo: true }).query.bool.filter, [
    { term: { participantes: 9 } },
    { range: { created_date: { gte: '2026-10-01T00:00:00.000Z', lte: '2026-10-21T00:00:00.000Z' } } },
    { term: { contem_codigo: true } },
  ]);
  assert.deepEqual(montarConsultaBuscaDireta({ usuarioId: 9, texto: 'a', inicio }).query.bool.filter[1], { range: { created_date: { gte: '2026-10-01T00:00:00.000Z' } } });
  assert.deepEqual(montarConsultaBuscaDireta({ usuarioId: 9, texto: 'a', fim }).query.bool.filter[1], { range: { created_date: { lte: '2026-10-21T00:00:00.000Z' } } });
  assert.equal(montarConsultaBuscaDireta({ usuarioId: 9, texto: 'a', somenteCodigo: false }).query.bool.filter.length, 1);
});

// --- supervisão -------------------------------------------------------------

test('a supervisão exclui as conversas com gestor ou administrador, pagina em cima da agregação e conta o total', () => {
  const consulta = montarConsultaSupervisao({ usuarioIdsExcluidos: [1, 2], pagina: 3, porPagina: 20 }) as any;
  assert.equal(consulta.size, 0);
  assert.deepEqual(consulta.query.bool.must_not, [{ terms: { participantes: [1, 2] } }]);
  assert.deepEqual(consulta.query.bool.filter, []);
  assert.equal('must' in consulta.query.bool, false, 'sem texto não há busca');
  assert.deepEqual(consulta.aggs.total, { cardinality: { field: 'conversa_id' } });
  assert.deepEqual(consulta.aggs.conversas.terms, { field: 'conversa_id', size: LIMITE_CONVERSAS_DA_SUPERVISAO, order: { ultima: 'desc' } });
  assert.deepEqual(consulta.aggs.conversas.aggs.pagina, { bucket_sort: { from: 40, size: 20 } });
});

test('a supervisão sem ninguém a excluir não manda o filtro vazio, e com texto, período e código filtra', () => {
  const inicio = new Date('2026-10-01T00:00:00.000Z');
  const consulta = montarConsultaSupervisao({ usuarioIdsExcluidos: [], texto: 'filtro', inicio, somenteCodigo: true, pagina: 1, porPagina: 10 }) as any;
  assert.equal('must_not' in consulta.query.bool, false);
  assert.deepEqual(consulta.query.bool.must, [{ match: { texto: { query: 'filtro', operator: 'and' } } }]);
  assert.deepEqual(consulta.query.bool.filter, [{ range: { created_date: { gte: '2026-10-01T00:00:00.000Z' } } }, { term: { contem_codigo: true } }]);
  assert.deepEqual(consulta.aggs.conversas.aggs.pagina, { bucket_sort: { from: 0, size: 10 } });
});

test('a supervisão recusa página inválida e o que passa do limite agregado', () => {
  for (const pagina of [0, -1]) recusaCom(() => montarConsultaSupervisao({ usuarioIdsExcluidos: [], pagina, porPagina: 10 }), /Página/);
  for (const porPagina of [0, 101]) recusaCom(() => montarConsultaSupervisao({ usuarioIdsExcluidos: [], pagina: 1, porPagina }), /Página/);
  recusaCom(() => montarConsultaSupervisao({ usuarioIdsExcluidos: [], pagina: 11, porPagina: 100 }), /1\.000/);
  assert.doesNotThrow(() => montarConsultaSupervisao({ usuarioIdsExcluidos: [], pagina: 10, porPagina: 100 }));
});
