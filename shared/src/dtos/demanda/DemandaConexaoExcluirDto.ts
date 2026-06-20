/**
 * DTO de exclusão de conexão de demanda.
 * Agrupa os dois identificadores de rota (`demandaId` + `conexaoId`) para que a
 * service não receba primitivos (§16 #21). O repositório usa apenas `conexaoId`.
 */
export class DemandaConexaoExcluirDto {
  demandaId: number;
  conexaoId: number;
}
