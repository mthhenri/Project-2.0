/** Interno (repository): remove a reação da pessoa à mensagem (soft delete). */
export interface MensagemDiretaReacaoInternoRemoverDto {
    mensagemId: string;
    usuarioId: number;
}
