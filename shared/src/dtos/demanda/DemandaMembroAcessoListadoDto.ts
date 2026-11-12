/** Uma pessoa com acesso a uma demanda ou a um projeto por `demanda_usuario`; `alvoId` é o id da demanda ou do projeto e `entradaData`, a atribuição mais antiga. */
export interface DemandaMembroAcessoListadoDto {
    alvoId: number;
    usuarioId: number;
    entradaData: Date;
}
