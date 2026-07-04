/**
 * Parâmetros de entrada da visão de Planejamento.
 * `projetoId` é injetado pela controller a partir do @Query (espelha DemandaGrafoRecuperarDto).
 */
export class DemandaPlanejamentoListarDto {
  projetoId: number;
}
