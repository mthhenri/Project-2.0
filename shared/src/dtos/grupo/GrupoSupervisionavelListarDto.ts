/** Interno (repository): os grupos livres sem nenhum dos `usuarioIdsComPoderDeGestor` entre os membros atuais (e com ao menos um membro). */
export interface GrupoSupervisionavelListarDto {
    usuarioIdsComPoderDeGestor: number[];
}
