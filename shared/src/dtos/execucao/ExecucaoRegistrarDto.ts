import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

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
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao: string;
}
