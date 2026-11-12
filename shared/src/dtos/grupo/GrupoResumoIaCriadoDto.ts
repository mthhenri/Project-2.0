/** O resumo pronto: o texto (já com a linha de IA no fim) e o que a tela precisa para oferecer copiar ou gravar. */
export interface GrupoResumoIaCriadoDto {
    resumoId: number;
    texto: string;
    quantidadeMensagens: number;
    inicioData: Date;
    fimData: Date;
    tokensEntrada: number;
    tokensSaida: number;
}
