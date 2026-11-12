/** A proposta criada: a pessoa a revisa e confirma ou recusa. */
export interface GrupoResumoIaPropostaCriadaDto {
    propostaId: number;
    demandaId: number;
    demandaNome: string;
    /** Exatamente o que será acrescentado ao fim da documentação (título com data e período, e o texto). */
    textoAcrescentado: string;
}
