import { AutorChatEnum, ChatMensagemResumoDto, ContextoChatEnum, NivelIaEnum } from '@project20/shared';

/** A mensagem a gravar (o repository cria o `id` e a data). */
export interface ChatMensagemNova {
  conversaId: string;
  usuarioId: number;
  contexto: ContextoChatEnum;
  autor: AutorChatEnum;
  texto: string;
  nivel?: NivelIaEnum | null;
  modelo?: string | null;
  tokensEntrada?: number | null;
  tokensSaida?: number | null;
  tokensCache?: number | null;
  propostaId?: number | null;
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
  texto: string;
  nivel: string | null;
  modelo: string | null;
  tokens_entrada: number | null;
  tokens_saida: number | null;
  tokens_cache: number | null;
  proposta_id: number | null;
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
    texto: mensagem.texto,
    nivel: mensagem.nivel ?? null,
    modelo: mensagem.modelo ?? null,
    tokens_entrada: mensagem.tokensEntrada ?? null,
    tokens_saida: mensagem.tokensSaida ?? null,
    tokens_cache: mensagem.tokensCache ?? null,
    proposta_id: mensagem.propostaId ?? null,
    execucao_id: mensagem.execucaoId ?? null,
    atividade_id: mensagem.atividadeId ?? null,
    demanda_id: mensagem.demandaId ?? null,
    conteudo_bruto: mensagem.conteudoBruto ?? null,
    created_date: criadaEm.toISOString(),
  };
}

export function deFonte(fonte: ChatMensagemFonte): ChatMensagemLida {
  return {
    id: fonte.mensagem_id,
    conversaId: fonte.conversa_id,
    usuarioId: fonte.usuario_id,
    contexto: fonte.contexto as ContextoChatEnum,
    autor: fonte.autor as AutorChatEnum,
    texto: fonte.texto,
    nivel: (fonte.nivel as NivelIaEnum | null) ?? null,
    modelo: fonte.modelo,
    tokensEntrada: fonte.tokens_entrada,
    tokensSaida: fonte.tokens_saida,
    tokensCache: fonte.tokens_cache,
    propostaId: fonte.proposta_id,
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
