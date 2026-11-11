/**
 * Qual proposta da IA ver numa conversa (task 315). Vem da rota (`/conversa/:usuarioId/mensagem/:mensagemId/proposta/:propostaId`) e é preenchido pela
 * controller. A mensagem é a resposta da IA que traz a proposta: é por ela que a service sabe que a proposta é desta conversa.
 */
export class MensagemDiretaPropostaRecuperarDto {
    /** A OUTRA pessoa da conversa. */
    usuarioId: number;
    mensagemId: string;
    propostaId: number;
}
