import { AutorMensagemDiretaEnum, LIMITE_MAXIMO_DA_CONVERSA_DIRETA, MensagemDiretaResumoDto, lerConversaDiretaId } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { MAPEAMENTO_CHAT_MENSAGEM } from '../../chat/domain/chat-consultas';
import { MensagemDiretaFonte } from './mensagem-direta.documento';

/** O índice das mensagens entre colaboradores: nunca o `chat-mensagem` da IA (aquele assume um dono por conversa e os contextos CHAT e CHECKIN). */
export const INDICE_MENSAGEM_DIRETA = 'mensagem-direta';

/** Conversas que a lista do popup traz (o time é pequeno; passar disso pede outra estratégia). */
export const LIMITE_CONVERSAS_DO_USUARIO = 200;
export const LIMITE_BUSCA_DIRETA = 50;
/** Conversas que a supervisão agrega; a paginação é feita em cima delas (`bucket_sort`). */
export const LIMITE_CONVERSAS_DA_SUPERVISAO = 1000;
export const LIMITE_POR_PAGINA_DA_SUPERVISAO = 100;
/** Conversas cujas não lidas são contadas de uma vez. */
export const LIMITE_MARCADORES_DE_LEITURA = LIMITE_CONVERSAS_DO_USUARIO;

/** A ordem da conversa: da mais nova para a mais antiga, com o `mensagem_id` como desempate estável. */
const ORDEM_DA_CONVERSA = [{ created_date: 'desc' }, { mensagem_id: 'desc' }];

/**
 * Um documento por mensagem, em índice próprio. O texto usa o mesmo analisador do chat da IA (português sem acento: `descricao` acha
 * `descrição`), por isso as configurações vêm de lá. O `mensagem_id` é também o `_id`.
 */
export const MAPEAMENTO_MENSAGEM_DIRETA = {
  settings: MAPEAMENTO_CHAT_MENSAGEM.settings,
  mappings: {
    properties: {
      mensagem_id: { type: 'keyword' },
      conversa_id: { type: 'keyword' },
      participantes: { type: 'integer' },
      autor_usuario_id: { type: 'integer' },
      autor: { type: 'keyword' },
      texto: { type: 'text', analyzer: 'texto_pt' },
      contem_codigo: { type: 'boolean' },
      mencoes: { type: 'integer' },
      referencias: { type: 'keyword' },
      created_date: { type: 'date' },
    },
  },
};

// ---------------------------------------------------------------------------
// Tipos das consultas
// ---------------------------------------------------------------------------

export interface ConsultaConversaDireta {
  conversaId: string;
  /** O `proximoCursor` da página anterior; sem ele vem a página mais nova. */
  cursor?: string;
  limite: number;
}

export interface PaginaDeMensagensDiretas {
  /** Da mais nova para a mais antiga. */
  mensagens: MensagemDiretaResumoDto[];
  /** Opaco; `null` quando não há página mais antiga. */
  proximoCursor: string | null;
}

export interface ConsultaConversasDoUsuario {
  usuarioId: number;
}

/** Uma conversa na lista: o total e a última mensagem (na supervisão com filtro de texto, a última que casou). */
export interface ResumoDeConversaDireta {
  conversaId: string;
  participantes: number[];
  totalMensagens: number;
  ultimaMensagem: MensagemDiretaResumoDto;
}

/** Até onde a pessoa leu uma conversa: a data da última mensagem que viu (`null` = ainda não leu nada). */
export interface MarcadorDeLeitura {
  conversaId: string;
  lidaAteDate: Date | null;
}

export interface ConsultaNaoLidas {
  usuarioId: number;
  marcadores: MarcadorDeLeitura[];
}

export interface ConsultaBuscaDireta {
  usuarioId: number;
  texto: string;
  inicio?: Date;
  fim?: Date;
  somenteCodigo?: boolean;
}

export interface ConsultaSupervisao {
  /** Ids de gestores e administradores: conversa com algum deles é privada e nunca entra. */
  usuarioIdsExcluidos: number[];
  texto?: string;
  inicio?: Date;
  fim?: Date;
  somenteCodigo?: boolean;
  /** Começa em 1. */
  pagina: number;
  porPagina: number;
}

export interface PaginaDeConversasSupervisionadas {
  conversas: ResumoDeConversaDireta[];
  /** Quantas conversas casam, em todas as páginas (contagem aproximada do serviço, exata em volumes pequenos). */
  total: number;
}

// ---------------------------------------------------------------------------
// Cursor opaco da conversa: os valores de ordenação da última mensagem da página
// ---------------------------------------------------------------------------

/** `[created_date em milissegundos, mensagem_id]`, os dois valores de `ORDEM_DA_CONVERSA`. */
export type ValoresDoCursor = [number, string];

export function codificarCursor(fonte: Pick<MensagemDiretaFonte, 'created_date' | 'mensagem_id'>): string {
  const valores: ValoresDoCursor = [new Date(fonte.created_date).getTime(), fonte.mensagem_id];
  return Buffer.from(JSON.stringify(valores), 'utf8').toString('base64url');
}

export function decodificarCursor(cursor: string): ValoresDoCursor {
  try {
    const valores = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (Array.isArray(valores) && valores.length === 2 && Number.isFinite(valores[0]) && typeof valores[1] === 'string' && valores[1].length > 0) {
      return [valores[0], valores[1]];
    }
  } catch {
    // cai no erro abaixo
  }
  throw new BusinessException('Cursor da conversa inválido');
}

// ---------------------------------------------------------------------------
// Validação das consultas, igual para todo armazenamento
// ---------------------------------------------------------------------------

/** A conversa é válida e o limite cabe na faixa. O cursor é conferido por quem o lê (`decodificarCursor`). */
export function validarConsultaConversaDireta(consulta: ConsultaConversaDireta): void {
  if (!lerConversaDiretaId(consulta.conversaId)) throw new BusinessException('Conversa direta inválida');
  if (!Number.isInteger(consulta.limite) || consulta.limite < 1 || consulta.limite > LIMITE_MAXIMO_DA_CONVERSA_DIRETA) {
    throw new BusinessException(`O limite da conversa deve ficar entre 1 e ${LIMITE_MAXIMO_DA_CONVERSA_DIRETA}`);
  }
}

export function validarConsultaNaoLidas(consulta: ConsultaNaoLidas): void {
  if (consulta.marcadores.length > LIMITE_MARCADORES_DE_LEITURA) {
    throw new BusinessException(`Só dá para contar as não lidas de até ${LIMITE_MARCADORES_DE_LEITURA} conversas de uma vez`);
  }
}

export function validarConsultaBuscaDireta(consulta: ConsultaBuscaDireta): void {
  if (!consulta.texto.trim()) throw new BusinessException('Informe o texto da busca');
}

/** A página pedida cabe no que a supervisão agrega; devolve quantas conversas pular (`from`). */
export function validarPaginaDaSupervisao(consulta: ConsultaSupervisao): number {
  if (consulta.pagina < 1 || consulta.porPagina < 1 || consulta.porPagina > LIMITE_POR_PAGINA_DA_SUPERVISAO) {
    throw new BusinessException('Página da supervisão inválida');
  }
  const inicio = (consulta.pagina - 1) * consulta.porPagina;
  if (inicio + consulta.porPagina > LIMITE_CONVERSAS_DA_SUPERVISAO) {
    throw new BusinessException('A supervisão lista até as primeiras 1.000 conversas; refine a busca');
  }
  return inicio;
}

/**
 * A página da conversa a partir do que a consulta devolveu (pediu-se `limite + 1`): o excedente nunca sai, só prova que há página mais
 * antiga, e o cursor aponta a última mensagem devolvida.
 */
export function montarPaginaDeMensagens(
  fontes: MensagemDiretaFonte[],
  limite: number,
  deFonte: (fonte: MensagemDiretaFonte) => MensagemDiretaResumoDto,
): PaginaDeMensagensDiretas {
  const pagina = fontes.slice(0, limite);
  const haMais = fontes.length > limite;
  return { mensagens: pagina.map(deFonte), proximoCursor: haMais ? codificarCursor(pagina[pagina.length - 1]) : null };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/**
 * Uma página da conversa. Pede `limite + 1` para saber se há mais: o excedente nunca é devolvido, só prova a página seguinte. Não filtra por
 * pessoa: quem pode ler a conversa é decidido na service.
 */
export function montarConsultaConversaDireta(consulta: ConsultaConversaDireta) {
  return {
    size: consulta.limite + 1,
    query: { bool: { filter: [{ term: { conversa_id: consulta.conversaId } }] } },
    sort: ORDEM_DA_CONVERSA,
    ...(consulta.cursor ? { search_after: decodificarCursor(consulta.cursor) } : {}),
  };
}

/** A agregação por conversa: a mais recente primeiro, com o total e a última mensagem de cada uma. */
function agregacaoDeConversas(tamanho: number, paginacao?: { from: number; size: number }) {
  return {
    terms: { field: 'conversa_id', size: tamanho, order: { ultima: 'desc' } },
    aggs: {
      ultima: { max: { field: 'created_date' } },
      ultima_mensagem: { top_hits: { size: 1, sort: ORDEM_DA_CONVERSA } },
      ...(paginacao ? { pagina: { bucket_sort: paginacao } } : {}),
    },
  };
}

/** As conversas em que a pessoa participa, da que teve mensagem mais recente, sem as mensagens além da última. */
export function montarConsultaConversasDoUsuario(consulta: ConsultaConversasDoUsuario) {
  return {
    size: 0,
    query: { bool: { filter: [{ term: { participantes: consulta.usuarioId } }] } },
    aggs: { conversas: agregacaoDeConversas(LIMITE_CONVERSAS_DO_USUARIO) },
  };
}

/** Os filtros de período e de código, comuns à busca e à supervisão. */
function filtrosDeRecorte(recorte: { inicio?: Date; fim?: Date; somenteCodigo?: boolean }): unknown[] {
  const filtros: unknown[] = [];
  if (recorte.inicio || recorte.fim) {
    filtros.push({
      range: {
        created_date: {
          ...(recorte.inicio ? { gte: recorte.inicio.toISOString() } : {}),
          ...(recorte.fim ? { lte: recorte.fim.toISOString() } : {}),
        },
      },
    });
  }
  if (recorte.somenteCodigo) filtros.push({ term: { contem_codigo: true } });
  return filtros;
}

const CASAR_TEXTO = (texto: string) => ({ match: { texto: { query: texto, operator: 'and' } } });

/**
 * Quantas mensagens do outro vieram depois do marcador de cada conversa, numa agregação `filters` (um balde por conversa). Só conta a
 * mensagem de pessoa (`USUARIO`) que não é a minha: o aviso do sistema e o que eu escrevi nunca ficam "não lidos".
 */
export function montarConsultaNaoLidas(consulta: ConsultaNaoLidas) {
  const filtros = Object.fromEntries(
    consulta.marcadores.map((marcador) => [
      marcador.conversaId,
      {
        bool: {
          filter: [
            { term: { conversa_id: marcador.conversaId } },
            ...(marcador.lidaAteDate ? [{ range: { created_date: { gt: marcador.lidaAteDate.toISOString() } } }] : []),
          ],
        },
      },
    ]),
  );
  return {
    size: 0,
    query: {
      bool: {
        filter: [{ term: { participantes: consulta.usuarioId } }, { term: { autor: AutorMensagemDiretaEnum.USUARIO } }],
        must_not: [{ term: { autor_usuario_id: consulta.usuarioId } }],
      },
    },
    aggs: { nao_lidas: { filters: { filters: filtros } } },
  };
}

/** Busca textual nas mensagens das conversas da pessoa, mais relevantes primeiro, com período e filtro de código opcionais. */
export function montarConsultaBuscaDireta(consulta: ConsultaBuscaDireta) {
  return {
    size: LIMITE_BUSCA_DIRETA,
    query: {
      bool: {
        filter: [{ term: { participantes: consulta.usuarioId } }, ...filtrosDeRecorte(consulta)],
        must: [CASAR_TEXTO(consulta.texto)],
      },
    },
    sort: [{ _score: 'desc' }, { created_date: 'desc' }, { mensagem_id: 'desc' }],
  };
}

/**
 * A lista da supervisão: todas as conversas em que nenhum participante é gestor ou administrador (`must_not` nos ids excluídos), com
 * busca de texto, período e filtro de código opcionais. Agrega até `LIMITE_CONVERSAS_DA_SUPERVISAO` conversas e pagina em cima delas
 * (`bucket_sort`); `total` conta todas as que casam.
 */
export function montarConsultaSupervisao(consulta: ConsultaSupervisao) {
  const inicio = validarPaginaDaSupervisao(consulta);
  return {
    size: 0,
    query: {
      bool: {
        filter: filtrosDeRecorte(consulta),
        ...(consulta.texto ? { must: [CASAR_TEXTO(consulta.texto)] } : {}),
        ...(consulta.usuarioIdsExcluidos.length > 0 ? { must_not: [{ terms: { participantes: consulta.usuarioIdsExcluidos } }] } : {}),
      },
    },
    aggs: {
      total: { cardinality: { field: 'conversa_id' } },
      conversas: agregacaoDeConversas(LIMITE_CONVERSAS_DA_SUPERVISAO, { from: inicio, size: consulta.porPagina }),
    },
  };
}

// ---------------------------------------------------------------------------
// Resposta das agregações
// ---------------------------------------------------------------------------

/** Um balde da agregação por conversa. */
export interface BaldeConversaDireta {
  key: string;
  doc_count: number;
  ultima_mensagem: { hits: { hits: { _source: MensagemDiretaFonte }[] } };
}

/** Os baldes viram uma linha por conversa; balde sem a última mensagem (não deveria existir) é ignorado. */
export function deBaldesDeConversas(baldes: BaldeConversaDireta[], deFonte: (fonte: MensagemDiretaFonte) => MensagemDiretaResumoDto): ResumoDeConversaDireta[] {
  return baldes.flatMap((balde) => {
    const fonte = balde.ultima_mensagem?.hits?.hits?.[0]?._source;
    if (!fonte) return [];
    return [{ conversaId: balde.key, participantes: fonte.participantes, totalMensagens: balde.doc_count, ultimaMensagem: deFonte(fonte) }];
  });
}

/** Cada conversa pedida aparece no resultado, com zero quando nenhuma mensagem do outro veio depois do marcador. */
export function deBaldesDeNaoLidas(conversaIds: string[], baldes: Record<string, { doc_count: number }> | undefined): Record<string, number> {
  return Object.fromEntries(conversaIds.map((conversaId) => [conversaId, baldes?.[conversaId]?.doc_count ?? 0]));
}
