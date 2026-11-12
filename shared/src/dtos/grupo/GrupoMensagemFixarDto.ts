/** Fixa uma mensagem do grupo ou canal (idempotente) ou a desafixa. Tudo vem da rota e é preenchido pela controller. */
export class GrupoMensagemFixarDto {
    grupoId: number;
    mensagemId: string;
}
