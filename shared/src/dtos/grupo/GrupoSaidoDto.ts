/** Quem pediu saiu do grupo. `grupoEncerrado` quando era o último membro: o grupo fecha e o histórico permanece. */
export interface GrupoSaidoDto {
    grupoId: number;
    grupoEncerrado: boolean;
}
