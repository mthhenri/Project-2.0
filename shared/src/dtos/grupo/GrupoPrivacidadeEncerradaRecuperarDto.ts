/**
 * Interno (repository): de qual grupo e de quem tem poder de gestor (`usuarioIdsComPoderDeGestor`) se quer saber **quando o grupo deixou de ser
 * privado**, isto é, quando o último gestor ou administrador saiu dele (task 362).
 */
export interface GrupoPrivacidadeEncerradaRecuperarDto {
    grupoId: number;
    usuarioIdsComPoderDeGestor: number[];
}
