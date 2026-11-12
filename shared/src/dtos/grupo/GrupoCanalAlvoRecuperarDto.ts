/** Interno (repository): o canal de uma demanda (`demandaId`) ou o de um projeto (`projetoId`, com `demandaId` nulo). Exatamente um dos dois vem preenchido. */
export interface GrupoCanalAlvoRecuperarDto {
    demandaId: number | null;
    projetoId: number | null;
}
