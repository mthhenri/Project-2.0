/** Um plano na lista do seletor. Não leva os textos. */
export interface PlanoResumoDto {
    id: number;
    titulo: string;
    projetoId: number | null;
    projetoNome: string | null;
    demandaId: number | null;
    demandaNome: string | null;
    criadorId: number;
    criadorNome: string;
    solo: boolean;
    arquivado: boolean;
    updatedDate: string;
}
