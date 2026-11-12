/** Interno (repository): grava a linha de um resumo gerado. */
export interface GrupoResumoIaInternoCriarDto {
    grupoId: number;
    usuarioId: number;
    inicioData: Date;
    fimData: Date;
    enviouCodigo: boolean;
    quantidadeMensagens: number;
    modelo: string;
    tokensEntrada: number;
    tokensSaida: number;
}
