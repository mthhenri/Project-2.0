import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class PontoConsultarDto {
  @IsDateString()
  data: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;
}
