/** Interno (repository): silencia ou reativa os avisos do grupo para a pessoa. */
export interface GrupoSilencioInternoAlterarDto {
    grupoId: number;
    usuarioId: number;
    silenciada: boolean;
}
