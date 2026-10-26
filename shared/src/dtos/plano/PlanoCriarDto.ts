import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class PlanoCriarDto {
  /** Sem título, a service usa `TITULO_PADRAO_DO_PLANO`. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titulo?: string;

  /** Sem projeto (e sem demanda), o plano é amplo e pessoal do criador. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  projetoId?: number;

  /** Demanda já ligada; sem `projetoId`, o plano nasce no projeto da demanda. */
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  demandaId?: number;
}
