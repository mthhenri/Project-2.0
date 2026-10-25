import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Entrada da ferramenta `propor_desconectar_demanda` (gestor) e, com os nomes para o cartão, os dados da proposta `DESCONECTAR_DEMANDA`: remove a
 * conexão do grafo entre duas demandas, no sentido em que ela existe (origem → destino, como o grafo as mostra). As demandas não mudam de lugar.
 */
export class ProporDesconectarDemandaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaOrigemId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaDestinoId: number;
}

/** Os dados guardados na proposta: a entrada mais os nomes e se a conexão era nos dois sentidos, para o cartão e para o desfazer recriá-la igual. */
export class PropostaDesconectarDemandaDadosDto extends ProporDesconectarDemandaDto {
  @IsOptional()
  @IsString()
  demandaOrigemNome?: string;

  @IsOptional()
  @IsString()
  demandaDestinoNome?: string;

  @IsOptional()
  @IsBoolean()
  ehBidirecional?: boolean;
}
