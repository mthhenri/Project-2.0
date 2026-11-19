/** Interno (repository): grava a linha de um resumo gerado. */
export interface GrupoResumoIaInternoCriarDto {
    grupoId: number;
    usuarioId: number;
    inicioData: Date;
    fimData: Date;
    enviouCodigo: boolean;
    quantidadeMensagens: number;
    /** O texto final do resumo (o que a tela mostra), guardado para o histórico do grupo. */
    texto: string;
    modelo: string;
    tokensEntrada: number;
    tokensSaida: number;
}
