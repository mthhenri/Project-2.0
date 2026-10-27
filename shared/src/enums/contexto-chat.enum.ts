/**
 * Em que fluxo a mensagem nasceu: a conversa do dia, um check-in (task 135), a conversa de um plano (task 234) ou o uso da IA fora da conversa
 * (task 260), que só serve à conta da aba Custos e nunca aparece numa conversa nem na busca.
 */
export enum ContextoChatEnum {
  CHAT         = 'CHAT',
  CHECKIN      = 'CHECKIN',
  PLANEJAMENTO = 'PLANEJAMENTO',
  USO_DE_IA    = 'USO_DE_IA',
}
