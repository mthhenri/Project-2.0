import { GrupoResumoIaDestinoEnum } from '../../enums/grupo-resumo-ia-destino.enum';

/** O que abre o diálogo de resumo: o fim do último resumo do grupo e onde este pode ser gravado. */
export interface GrupoResumoIaRecuperadoDto {
    /** O fim do período do último resumo gerado neste grupo; `null` se nunca houve. */
    ultimoResumoData: Date | null;
    destino: GrupoResumoIaDestinoEnum;
    /** A demanda do canal (destino `DEMANDA`). */
    demandaId: number | null;
    /** O projeto do canal (destino `PROJETO`, em que a pessoa escolhe a demanda). */
    projetoId: number | null;
}
