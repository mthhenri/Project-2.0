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
  | { tipo: 'erro'; mensagem: string };
