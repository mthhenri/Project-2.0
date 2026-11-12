/** Uma demanda em que a pessoa está atribuída; `entradaData` é a data em que ela foi atribuída. */
export interface DemandaAcessoUsuarioListadoDto {
    demandaId: number;
    projetoId: number;
    entradaData: Date;
}
