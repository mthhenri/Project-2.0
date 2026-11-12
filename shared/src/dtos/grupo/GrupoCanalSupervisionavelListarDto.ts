/** Interno (repository): todos os canais ainda existentes, sem os de que o leitor já é membro (esses ele abre pelo chat, não pela supervisão). */
export interface GrupoCanalSupervisionavelListarDto {
    leitorUsuarioId: number;
}
