import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PontoMensalConsultarDto {
  @IsNumber()
  @Min(2000)
  @Type(() => Number)
  ano: number;

  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;
}
