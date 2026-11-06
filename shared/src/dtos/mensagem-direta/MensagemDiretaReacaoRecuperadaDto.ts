/** Interno (repository): uma reação gravada, com a mensagem a que pertence. */
export interface MensagemDiretaReacaoRecuperadaDto {
    mensagemId: string;
    usuarioId: number;
    reacao: string;
}
