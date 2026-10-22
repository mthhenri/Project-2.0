/** Interno (repository): busca demandas pelo nome. `usuarioId` restringe aos projetos em que a pessoa tem demanda atribuída; `null` não restringe (gestor e administrador). */
export interface DemandaNomeBuscarDto {
  texto: string;
  usuarioId: number | null;
  limite: number;
}
