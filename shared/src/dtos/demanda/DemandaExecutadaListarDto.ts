import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Quantas demandas executadas voltam quando o pedido não diz. */
export const LIMITE_PADRAO_DEMANDAS_EXECUTADAS = 20;
/** O máximo que um pedido pode trazer. */
export const LIMITE_MAXIMO_DEMANDAS_EXECUTADAS = 50;

/** Filtro de `GET /demanda/executadas`: as demandas que o próprio usuário executou (sempre o do token), da execução mais recente para a mais antiga. */
export class DemandaExecutadaListarDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO_DEMANDAS_EXECUTADAS)
  @Type(() => Number)
  limite?: number;
}
