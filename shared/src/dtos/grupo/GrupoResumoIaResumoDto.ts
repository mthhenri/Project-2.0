/** Um resumo já feito, na lista "Resumos anteriores" do diálogo de resumo do grupo. */
export interface GrupoResumoIaResumoDto {
    resumoId: number;
    /** O texto final do resumo; `null` nos resumos feitos antes de o texto ser guardado. */
    texto: string | null;
    quantidadeMensagens: number;
    inicioData: Date;
    fimData: Date;
    /** Quando o resumo foi gerado. */
    criadoData: Date;
    pedidoPorUsuarioId: number;
    pedidoPorNome: string | null;
    /** O resumo é de quem está vendo: só ele o grava na documentação. */
    pedidoPorVoce: boolean;
    /** Já foi gravado na documentação (a gravação é uma vez só). */
    gravado: boolean;
}
