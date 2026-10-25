export const INDICE_CHAT_MENSAGEM = 'chat-mensagem';
/** Um documento por conversa (id = `conversaId`) com o título que a IA deu a ela; separado das mensagens, que nunca são reescritas. */
export const INDICE_CHAT_CONVERSA = 'chat-conversa';

/** Limite de uma conversa do dia lida de uma vez (uma conversa por dia nunca chega perto). */
export const LIMITE_CONVERSA = 1000;
export const LIMITE_BUSCA = 50;
/** Quantas conversas (dias) a lista do histórico traz. */
export const LIMITE_CONVERSAS = 100;

/**
 * Campos que nasceram depois da criação do índice (task 191: `assunto`; task 225: `propostas_ids`). Um índice que já existe não os tem; `acrescentarCampos` os
 * põe nele ao subir (acrescentar um campo novo é permitido, mudar o tipo de um existente não).
 */
export const CAMPOS_POSTERIORES_DA_MENSAGEM = {
  assunto: { type: 'keyword' },
  propostas_ids: { type: 'integer' },
};

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
      ...CAMPOS_POSTERIORES_DA_MENSAGEM,
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

export const MAPEAMENTO_CHAT_CONVERSA = {
  mappings: {
    properties: {
      conversa_id: { type: 'keyword' },
      usuario_id: { type: 'integer' },
      titulo: { type: 'text', index: false },
      titulo_editado: { type: 'boolean' },
      created_date: { type: 'date' },
    },
  },
};

/** O nome de uma conversa: vazio quando só vale o padrão; `editado` quando foi o usuário que deu (a IA não o troca). */
export interface TituloDaConversa {
  titulo: string;
  editado: boolean;
}

/** Grava (ou troca) o nome da conversa; `titulo` vazio e `editado` falso devolvem a conversa ao nome padrão. */
export interface TituloParaGravar extends TituloDaConversa {
  conversaId: string;
  usuarioId: number;
}

export interface ConsultaTitulos {
  usuarioId: number;
  conversaIds: string[];
}

/** Os títulos das conversas pedidas, só as do dono. */
export function montarConsultaTitulos(consulta: ConsultaTitulos) {
  return {
    size: LIMITE_CONVERSAS,
    query: { bool: { filter: [{ term: { usuario_id: consulta.usuarioId } }, { terms: { conversa_id: consulta.conversaIds } }] } },
  };
}

/** Tamanho máximo do título de uma conversa. */
export const LIMITE_TITULO = 60;

/** Deixa só o título: sem aspas, ponto final nem quebra de linha, no limite de tamanho; vazio se não sobrar nada. */
export function limparTitulo(bruto: string): string {
  const semDecoracao = bruto
    .split(String.fromCharCode(10))[0]
    .replace(/^["'“”‘’«»\s*#-]+|["'“”‘’«»\s.*#]+$/g, '')
    .replace(/\s+/g, ' ');
  return semDecoracao.length > LIMITE_TITULO ? `${semDecoracao.slice(0, LIMITE_TITULO - 1).trimEnd()}…` : semDecoracao;
}

/**
 * O recorte da soma de tokens (task 202): do dia `dataInicio` ao `dataFim` (`yyyy-mm-dd`, extremos inclusos), no fuso do sistema, agrupado
 * por dia ou por mês. É o que a aba "Custos" soma: toda mensagem que tem modelo e tokens gravados, de qualquer usuário e contexto.
 */
export interface ConsultaTokens {
  dataInicio: string;
  dataFim: string;
  porMes: boolean;
  fusoHorario: string;
}

/** Os tokens de um modelo num período: `yyyy-mm-dd` (por dia) ou `yyyy-mm` (por mês). `mensagens` conta as mensagens que os gastaram. */
export interface TokensSomados {
  periodo: string;
  modelo: string;
  mensagens: number;
  tokensEntrada: number;
  tokensSaida: number;
  tokensCache: number;
}

/** Um período da agregação de tokens (`date_histogram`), com um balde por modelo dentro. */
export interface BaldeTokensPorPeriodo {
  key_as_string: string;
  modelos: {
    buckets: { key: string; doc_count: number; entrada: { value: number | null }; saida: { value: number | null }; cache: { value: number | null } }[];
  };
}

/** O dia seguinte a `yyyy-mm-dd`: o limite exclusivo do intervalo (evita depender de como cada serviço arredonda `lte` de uma data sem hora). */
export function diaSeguinte(dia: string): string {
  const data = new Date(`${dia}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + 1);
  return data.toISOString().slice(0, 10);
}

/** A soma de tokens por período e modelo: só mensagens com modelo e tokens, no fuso do sistema. Limite de 50 modelos por período. */
export function montarConsultaTokens(consulta: ConsultaTokens) {
  return {
    size: 0,
    query: {
      bool: {
        filter: [
          { exists: { field: 'tokens_entrada' } },
          { exists: { field: 'modelo' } },
          { range: { created_date: { gte: consulta.dataInicio, lt: diaSeguinte(consulta.dataFim), format: 'yyyy-MM-dd', time_zone: consulta.fusoHorario } } },
        ],
      },
    },
    aggs: {
      periodos: {
        date_histogram: {
          field: 'created_date',
          calendar_interval: consulta.porMes ? 'month' : 'day',
          format: consulta.porMes ? 'yyyy-MM' : 'yyyy-MM-dd',
          time_zone: consulta.fusoHorario,
          min_doc_count: 1,
        },
        aggs: {
          modelos: {
            terms: { field: 'modelo', size: 50 },
            aggs: {
              entrada: { sum: { field: 'tokens_entrada' } },
              saida: { sum: { field: 'tokens_saida' } },
              cache: { sum: { field: 'tokens_cache' } },
            },
          },
        },
      },
    },
  };
}

/** Os baldes da agregação viram uma linha por período e modelo (soma nula, de campo ausente, vale zero). */
export function deBaldesDeTokens(baldes: BaldeTokensPorPeriodo[]): TokensSomados[] {
  return baldes.flatMap((periodo) =>
    periodo.modelos.buckets.map((modelo) => ({
      periodo: periodo.key_as_string,
      modelo: modelo.key,
      mensagens: modelo.doc_count,
      tokensEntrada: modelo.entrada.value ?? 0,
      tokensSaida: modelo.saida.value ?? 0,
      tokensCache: modelo.cache.value ?? 0,
    })),
  );
}
