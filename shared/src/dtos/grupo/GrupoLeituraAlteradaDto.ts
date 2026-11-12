/** O ponto até onde a pessoa leu o grupo, como ficou gravado (nunca recua). */
export interface GrupoLeituraAlteradaDto {
    grupoId: number;
    conversaId: string;
    lidaAteData: Date;
}
