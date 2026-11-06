/** Interno (repository): grava a reação da pessoa à mensagem, trocando a que já havia. */
export interface MensagemDiretaReacaoInternoDefinirDto {
    mensagemId: string;
    conversaId: string;
    usuarioId: number;
    reacao: string;
}
