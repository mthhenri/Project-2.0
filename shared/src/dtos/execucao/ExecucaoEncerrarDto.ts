import { IsOptional, IsString, Matches } from 'class-validator';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

export class ExecucaoEncerrarDto {
  /**
   * Obrigatória quando o dono da atividade é desenvolvedor; opcional quando é gestor.
   * A regra é validada no service conforme o tipo do dono da execução.
   */
  @IsOptional()
  @IsString()
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao?: string;
}
