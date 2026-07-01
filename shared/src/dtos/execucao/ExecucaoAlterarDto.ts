import { IsNotEmpty, IsString, IsOptional, IsDateString, Matches } from 'class-validator';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '../../validators/caracteres-proibidos.validator';

export class ExecucaoAlterarDto {
  @IsString()
  @IsNotEmpty()
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao: string;

  @IsOptional()
  @IsDateString()
  inicioData?: string;

  // @IsOptional() ignora a validação quando o valor é null ou undefined,
  // permitindo manter a execução "em andamento" (fimData = null).
  @IsOptional()
  @IsDateString()
  fimData?: string | null;
}
