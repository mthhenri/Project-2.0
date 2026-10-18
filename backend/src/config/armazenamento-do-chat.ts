/**
 * Onde as mensagens do chat ficam (task 162). `elasticsearch` é o destino da produção de verdade e ainda não tem implementação:
 * pedir esse valor falha na subida, em vez de cair em outro armazenamento sem avisar.
 */
export type ArmazenamentoDoChat = 'opensearch' | 'postgres';

export const ARMAZENAMENTOS_DO_CHAT: readonly ArmazenamentoDoChat[] = ['opensearch', 'postgres'];

/** Lê `CHAT_ARMAZENAMENTO` (padrão `opensearch`); valor desconhecido ou ainda não implementado derruba a subida com mensagem clara. */
export function lerArmazenamentoDoChat(valor: string | undefined): ArmazenamentoDoChat {
  const informado = valor?.trim().toLowerCase();
  if (!informado) return 'opensearch';
  const suportado = ARMAZENAMENTOS_DO_CHAT.find((armazenamento) => armazenamento === informado);
  if (!suportado) {
    throw new Error(`Armazenamento do chat não suportado: ${valor} (CHAT_ARMAZENAMENTO aceita ${ARMAZENAMENTOS_DO_CHAT.join(' ou ')})`);
  }
  return suportado;
}
