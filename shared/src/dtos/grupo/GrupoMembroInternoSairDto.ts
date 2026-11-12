/** Interno (repository): a pessoa sai do grupo; se for a última, o grupo é encerrado (soft delete) na mesma transação. */
export interface GrupoMembroInternoSairDto {
    grupoId: number;
    usuarioId: number;
    saidaData: Date;
}
