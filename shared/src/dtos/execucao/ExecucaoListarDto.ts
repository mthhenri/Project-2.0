import { Type, Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

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

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  allRows?: boolean;
}
