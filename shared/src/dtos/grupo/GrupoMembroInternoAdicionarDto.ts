/** Interno (repository): põe a pessoa no grupo. Quem nunca esteve ganha uma linha; quem saiu tem a mesma linha reaberta com a entrada nova. */
export interface GrupoMembroInternoAdicionarDto {
    grupoId: number;
    usuarioId: number;
    entradaData: Date;
}
