/** Interno (repository): troca nome, cor e emoji do grupo (os três juntos; a service manda o que não mudou como estava). */
export interface GrupoInternoAlterarDto {
    grupoId: number;
    nome: string;
    corAvatar: string | null;
    emojiAvatar: string | null;
}
