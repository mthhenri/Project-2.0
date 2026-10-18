import { ChatMensagemResumoDto } from './ChatMensagemResumoDto';

/** Situação de uma ferramenta que a IA está usando (a tela mostra "consultando…"). */
export type ChatFerramentaSituacao = 'EXECUTANDO' | 'CONCLUIDA' | 'ERRO';

/**
 * Evento do fluxo de resposta (`POST /chat/mensagem`, `text/event-stream`, um JSON por evento). A resposta termina sempre com `fim`
 * (mensagem gravada) ou `erro`.
 */
export type ChatEventoDto =
  | { tipo: 'trecho'; texto: string }
  | { tipo: 'ferramenta'; nome: string; situacao: ChatFerramentaSituacao }
  | { tipo: 'proposta'; propostaId: number }
  | { tipo: 'fim'; mensagem: ChatMensagemResumoDto }
  /** Depois do `fim`: de 2 a 4 sugestões curtas do que o usuário pode responder (botões acima do campo). Nunca é gravado. */
  | { tipo: 'sugestoes'; itens: string[] }
  | { tipo: 'erro'; mensagem: string };
