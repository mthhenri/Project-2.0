import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class ExecucaoListarDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  atividadeId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;

  @IsOptional()
  @IsDateString()
  data?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  pagina?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  itensPorPagina?: number;
}
