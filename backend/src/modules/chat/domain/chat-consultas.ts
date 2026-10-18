export const INDICE_CHAT_MENSAGEM = 'chat-mensagem';

/** Limite de uma conversa do dia lida de uma vez (uma conversa por dia nunca chega perto). */
export const LIMITE_CONVERSA = 1000;
export const LIMITE_BUSCA = 50;
/** Quantas conversas (dias) a lista do histórico traz. */
export const LIMITE_CONVERSAS = 100;

/**
 * Índice único com um documento por mensagem. O texto é analisado em português **sem acento** (`descricao` acha `descrição`):
 * `brazilian` com `asciifolding` antes do radical. O subcampo `keyword` serve a ordenação e a igualdade exata.
 */
export const MAPEAMENTO_CHAT_MENSAGEM = {
  settings: {
    analysis: {
      filter: {
        brazilian_stop: { type: 'stop', stopwords: '_brazilian_' },
        brazilian_stemmer: { type: 'stemmer', language: 'brazilian' },
      },
      analyzer: {
        texto_pt: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding', 'brazilian_stop', 'brazilian_stemmer'],
        },
      },
    },
  },
  mappings: {
    properties: {
      mensagem_id: { type: 'keyword' },
      conversa_id: { type: 'keyword' },
      usuario_id: { type: 'integer' },
      contexto: { type: 'keyword' },
      autor: { type: 'keyword' },
      texto: { type: 'text', analyzer: 'texto_pt', fields: { keyword: { type: 'keyword', ignore_above: 512 } } },
      nivel: { type: 'keyword' },
      modelo: { type: 'keyword' },
      tokens_entrada: { type: 'integer' },
      tokens_saida: { type: 'integer' },
      tokens_cache: { type: 'integer' },
      proposta_id: { type: 'integer' },
      execucao_id: { type: 'integer' },
      atividade_id: { type: 'integer' },
      demanda_id: { type: 'integer' },
      conteudo_bruto: { type: 'object', enabled: false },
      created_date: { type: 'date' },
    },
  },
};

export interface ConsultaConversa {
  conversaId: string;
  usuarioId: number;
}

export interface ConsultaBusca {
  usuarioId: number;
  texto: string;
  inicio?: Date;
  fim?: Date;
}

/** A conversa do dia, em ordem. O filtro por dono vem junto: um usuário nunca lê a conversa de outro. */
export function montarConsultaConversa(consulta: ConsultaConversa) {
  return {
    size: LIMITE_CONVERSA,
    query: { bool: { filter: [{ term: { conversa_id: consulta.conversaId } }, { term: { usuario_id: consulta.usuarioId } }] } },
    sort: [{ created_date: 'asc' }],
  };
}

/** Busca textual nas mensagens do próprio usuário, mais relevantes primeiro, com filtro opcional de período. */
export function montarConsultaBusca(consulta: ConsultaBusca) {
  const filtros: unknown[] = [{ term: { usuario_id: consulta.usuarioId } }];
  if (consulta.inicio || consulta.fim) {
    filtros.push({
      range: {
        created_date: {
          ...(consulta.inicio ? { gte: consulta.inicio.toISOString() } : {}),
          ...(consulta.fim ? { lte: consulta.fim.toISOString() } : {}),
        },
      },
    });
  }
  return {
    size: LIMITE_BUSCA,
    query: { bool: { filter: filtros, must: [{ match: { texto: { query: consulta.texto, operator: 'and' } } }] } },
    sort: [{ _score: 'desc' }, { created_date: 'desc' }],
  };
}

export interface ConsultaConversas {
  usuarioId: number;
}

/** Uma conversa na agregação: o dia (`key`), o total, a última data e a primeira mensagem. */
export interface BaldeConversa {
  key: string;
  doc_count: number;
  ultima: { value: number };
  primeira: { hits: { hits: { _source: { texto: string } }[] } };
}

/** As conversas de chat do usuário, uma por `conversa_id`, da mais recente à mais antiga (o id termina na data `yyyy-mm-dd`). */
export function montarConsultaConversas(consulta: ConsultaConversas) {
  return {
    size: 0,
    query: { bool: { filter: [{ term: { usuario_id: consulta.usuarioId } }, { term: { contexto: 'CHAT' } }] } },
    aggs: {
      conversas: {
        terms: { field: 'conversa_id', size: LIMITE_CONVERSAS, order: { _key: 'desc' } },
        aggs: {
          ultima: { max: { field: 'created_date' } },
          primeira: { top_hits: { size: 1, sort: [{ created_date: 'asc' }], _source: ['texto'] } },
        },
      },
    },
  };
}
