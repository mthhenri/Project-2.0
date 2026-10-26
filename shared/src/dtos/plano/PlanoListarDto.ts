import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class PlanoListarDto {
  /** Trecho do título. Com busca, os planos arquivados também aparecem. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  busca?: string;

  /** Inclui os planos arquivados (o seletor os esconde). */
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  incluirArquivados?: boolean;

  @IsOptional()
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  projetoId?: number;
}
