/** Interno (repository): grava a reação da pessoa à mensagem, trocando a que já havia. O dono é a conversa um a um (`conversaId`) **ou** o grupo (`grupoId`), nunca os dois. */
export interface MensagemDiretaReacaoInternoDefinirDto {
    mensagemId: string;
    conversaId?: string;
    grupoId?: number;
    usuarioId: number;
    reacao: string;
}
