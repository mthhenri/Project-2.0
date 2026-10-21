/**
 * Por onde os eventos do chat entre colaboradores (task 209) chegam a todas as instâncias da API: `memoria` no desenvolvimento (uma
 * instância) e `postgres` (`LISTEN`/`NOTIFY`) onde há mais de uma instância.
 */
export type EventosDoChat = 'memoria' | 'postgres';

export const EVENTOS_DO_CHAT: readonly EventosDoChat[] = ['memoria', 'postgres'];

/** Lê `CHAT_EVENTOS` (padrão `memoria`); valor desconhecido derruba a subida com mensagem clara. */
export function lerEventosDoChat(valor: string | undefined): EventosDoChat {
  const informado = valor?.trim().toLowerCase();
  if (!informado) return 'memoria';
  const suportado = EVENTOS_DO_CHAT.find((eventos) => eventos === informado);
  if (!suportado) {
    throw new Error(`Barramento de eventos do chat não suportado: ${valor} (CHAT_EVENTOS aceita ${EVENTOS_DO_CHAT.join(' ou ')})`);
  }
  return suportado;
}
