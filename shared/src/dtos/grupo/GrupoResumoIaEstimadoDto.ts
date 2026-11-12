/** A estimativa de um resumo, antes de chamar o provedor de resumo. */
export interface GrupoResumoIaEstimadoDto {
    quantidadeMensagens: number;
    /** Quantas partes o período vira (cada uma é uma chamada, mais uma de fechamento quando há mais de uma). */
    quantidadeBlocos: number;
    quantidadeChamadas: number;
    tokensEntradaEstimados: number;
    tokensSaidaEstimados: number;
    /** O custo aproximado em dólares pelo preço do modelo principal do nível rápido; `null` se ele não tem preço cadastrado. */
    custoEstimadoDolar: number | null;
    /** Quantos blocos de código seriam trocados por `[trecho de código omitido]` (zero quando o código vai). */
    blocosDeCodigoOmitidos: number;
    enviaCodigo: boolean;
    /** Passa do teto de chamadas por resumo: não dá para resumir este período de uma vez. */
    acimaDoTeto: boolean;
}
