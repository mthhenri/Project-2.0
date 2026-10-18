/**
 * Onde as mensagens do chat ficam (tasks 162 e 163): `opensearch` no desenvolvimento, `postgres` (tabelas provisórias) na produção de
 * teste e `elasticsearch` na produção de verdade.
 */
export type ArmazenamentoDoChat = 'opensearch' | 'postgres' | 'elasticsearch';

export const ARMAZENAMENTOS_DO_CHAT: readonly ArmazenamentoDoChat[] = ['opensearch', 'postgres', 'elasticsearch'];

/** Lê `CHAT_ARMAZENAMENTO` (padrão `opensearch`); valor desconhecido derruba a subida com mensagem clara. */
export function lerArmazenamentoDoChat(valor: string | undefined): ArmazenamentoDoChat {
  const informado = valor?.trim().toLowerCase();
  if (!informado) return 'opensearch';
  const suportado = ARMAZENAMENTOS_DO_CHAT.find((armazenamento) => armazenamento === informado);
  if (!suportado) {
    throw new Error(`Armazenamento do chat não suportado: ${valor} (CHAT_ARMAZENAMENTO aceita ${ARMAZENAMENTOS_DO_CHAT.join(' ou ')})`);
  }
  return suportado;
}
