/**
 * DTO de remoção de membro da demanda, recebido pela service.
 * Agrupa os dois identificadores (`demandaId` da rota + `usuarioId` da rota)
 * para que a service não receba primitivos (§16 #21). Verbo `Remover` no fim (§5.1).
 */
export class DemandaMembroRemoverDto {
  demandaId: number;
  usuarioId: number;
}
