import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

export class ExecucaoIniciarDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  /**
   * Obrigatória para desenvolvedores; opcional para gestores.
   * A regra é validada no service conforme o tipo do usuário autenticado.
   */
  @IsOptional()
  @IsString()
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao?: string;
}
