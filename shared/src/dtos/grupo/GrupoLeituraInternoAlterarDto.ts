/** Interno (repository): grava (sem recuar) até onde a pessoa leu o grupo. */
export interface GrupoLeituraInternoAlterarDto {
    grupoId: number;
    usuarioId: number;
    lidaAteData: Date;
}
