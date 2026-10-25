import { AssuntoChatEnum, AutorChatEnum, ChatMensagemResumoDto, ContextoChatEnum, NivelIaEnum } from '@project20/shared';

/** A mensagem a gravar (o repository cria o `id` e a data). */
export interface ChatMensagemNova {
  conversaId: string;
  usuarioId: number;
  contexto: ContextoChatEnum;
  autor: AutorChatEnum;
  /** Sobre o que é a mensagem (task 191); ausente fica `null`. */
  assunto?: AssuntoChatEnum | null;
  texto: string;
  nivel?: NivelIaEnum | null;
  modelo?: string | null;
  tokensEntrada?: number | null;
  tokensSaida?: number | null;
  tokensCache?: number | null;
  /** As propostas do turno, na ordem em que nasceram (task 225). */
  propostaIds?: number[];
  execucaoId?: number | null;
  atividadeId?: number | null;
  demandaId?: number | null;
  /** Blocos no formato do provedor (inclusive chamadas de ferramenta), para remontar a conversa. Não é indexado. */
  conteudoBruto?: unknown;
}

/** A mensagem como o backend a lê: o resumo mais o conteúdo bruto. */
export interface ChatMensagemLida extends ChatMensagemResumoDto {
  conteudoBruto: unknown;
}

/** Forma do documento no índice (nomes da modelagem). */
export interface ChatMensagemFonte {
  mensagem_id: string;
  conversa_id: string;
  usuario_id: number;
  contexto: string;
  autor: string;
  /** Ausente nos documentos anteriores à task 191: conta como `null`. */
  assunto?: string | null;
  texto: string;
  nivel: string | null;
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  tokens_cache: number | null;
  /** A primeira proposta do turno: o campo antigo, que as mensagens anteriores à task 225 têm sozinho. */
  proposta_id: number | null;
  /** Todas as propostas do turno (task 225); ausente nas mensagens antigas, que contam como `[proposta_id]`. */
  propostas_ids?: number[] | null;
  execucao_id: number | null;
  atividade_id: number | null;
  demanda_id: number | null;
  conteudo_bruto: unknown;
  created_date: string;
}

export function paraFonte(mensagem: ChatMensagemNova, id: string, criadaEm: Date): ChatMensagemFonte {
  return {
    mensagem_id: id,
    conversa_id: mensagem.conversaId,
    usuario_id: mensagem.usuarioId,
    contexto: mensagem.contexto,
    autor: mensagem.autor,
    assunto: mensagem.assunto ?? null,
    texto: mensagem.texto,
    nivel: mensagem.nivel ?? null,
    modelo: mensagem.modelo ?? null,
    tokens_entrada: mensagem.tokensEntrada ?? null,
    tokens_saida: mensagem.tokensSaida ?? null,
    tokens_cache: mensagem.tokensCache ?? null,
    proposta_id: mensagem.propostaIds?.[0] ?? null,
    propostas_ids: mensagem.propostaIds ?? [],
    execucao_id: mensagem.execucaoId ?? null,
    atividade_id: mensagem.atividadeId ?? null,
    demanda_id: mensagem.demandaId ?? null,
    conteudo_bruto: mensagem.conteudoBruto ?? null,
    created_date: criadaEm.toISOString(),
  };
}

/** A lista de propostas da mensagem; a gravada antes da task 225 só tem `proposta_id` e vira uma lista de um. */
export function propostaIdsDaFonte(fonte: Pick<ChatMensagemFonte, 'proposta_id' | 'propostas_ids'>): number[] {
  if (fonte.propostas_ids && fonte.propostas_ids.length > 0) return fonte.propostas_ids;
  return fonte.proposta_id !== null && fonte.proposta_id !== undefined ? [fonte.proposta_id] : [];
}

export function deFonte(fonte: ChatMensagemFonte): ChatMensagemLida {
  return {
    id: fonte.mensagem_id,
    conversaId: fonte.conversa_id,
    usuarioId: fonte.usuario_id,
    contexto: fonte.contexto as ContextoChatEnum,
    autor: fonte.autor as AutorChatEnum,
    assunto: (fonte.assunto as AssuntoChatEnum | null | undefined) ?? null,
    texto: fonte.texto,
    nivel: (fonte.nivel as NivelIaEnum | null) ?? null,
    modelo: fonte.modelo,
    tokensEntrada: fonte.tokens_entrada,
    tokensSaida: fonte.tokens_saida,
    tokensCache: fonte.tokens_cache,
    propostaIds: propostaIdsDaFonte(fonte),
    execucaoId: fonte.execucao_id,
    atividadeId: fonte.atividade_id,
    demandaId: fonte.demanda_id,
    conteudoBruto: fonte.conteudo_bruto,
    createdDate: new Date(fonte.created_date),
  };
}

/** O que sai pela API: sem o conteúdo bruto do provedor. */
export function paraResumo(mensagem: ChatMensagemLida): ChatMensagemResumoDto {
  const { conteudoBruto: _conteudoBruto, ...resumo } = mensagem;
  return resumo;
}
