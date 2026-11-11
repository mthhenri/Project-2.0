/**
 * Uso interno (task 315): ler uma proposta da IA que está numa resposta do `@IA` do chat entre colaboradores. Quem chama (a service da conversa) já conferiu
 * que a proposta está numa mensagem da conversa de quem olha; `chamadaPorUsuarioId` é quem chamou a IA, o dono que a proposta precisa ter.
 */
export class PropostaIaParticipanteRecuperarDto {
    id: number;
    chamadaPorUsuarioId: number;
}
