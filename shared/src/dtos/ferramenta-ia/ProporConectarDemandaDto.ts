import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_conectar_demanda` (gestor) e, com os nomes para o cartão, os dados da proposta `CONECTAR_DEMANDA`: liga
 * duas demandas do grafo. Só se propõe a conexão que o gestor aceitou depois de a IA sugerir e perguntar.
 */
export class ProporConectarDemandaDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaOrigemId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaDestinoId: number;

  /** Sem informar, a conexão vale só no sentido origem → destino. */
  @IsOptional()
  @IsBoolean()
  ehBidirecional?: boolean;

  /** Por que ligar as duas (aparece no cartão). */
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  motivo: string;
}

/** Os dados guardados na proposta: a entrada mais os nomes das duas demandas, só para o cartão mostrar. */
export class PropostaConectarDemandaDadosDto extends ProporConectarDemandaDto {
  @IsOptional()
  @IsString()
  demandaOrigemNome?: string;

  @IsOptional()
  @IsString()
  demandaDestinoNome?: string;
}
