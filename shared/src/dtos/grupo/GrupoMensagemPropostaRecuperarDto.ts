/**
 * Qual proposta da IA ver num grupo (task 326). Tudo vem da rota (`grupo/:grupoId/mensagem/:mensagemId/proposta/:propostaId`) e é preenchido pela
 * controller. A mensagem é a resposta da IA que traz a proposta: é por ela que a service sabe que a proposta é deste grupo.
 */
export class GrupoMensagemPropostaRecuperarDto {
    grupoId: number;
    mensagemId: string;
    propostaId: number;
}
