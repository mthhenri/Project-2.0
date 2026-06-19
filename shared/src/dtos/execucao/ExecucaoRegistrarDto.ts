import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ExecucaoRegistrarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  @IsDateString()
  inicioData: string;

  @IsDateString()
  fimData: string;

  @IsString()
  @IsNotEmpty()
  descricao: string;
}
