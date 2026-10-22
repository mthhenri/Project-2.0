/** Interno (repository): busca atividades pelo nome. `usuarioId` restringe às atividades de demandas em que a pessoa está atribuída; `null` não restringe (gestor e administrador). */
export interface AtividadeNomeBuscarDto {
  texto: string;
  usuarioId: number | null;
  limite: number;
}
