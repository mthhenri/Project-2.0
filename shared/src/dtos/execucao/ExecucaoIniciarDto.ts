import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class ExecucaoIniciarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  @IsString()
  @IsNotEmpty()
  descricao: string;
}
