import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/** Cria um grupo do diagrama (só gestor). `rotulo` é o nome curto do botão de filtro e `titulo`, o da caixa. */
export class ModelagemGrupoCriarDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  titulo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  rotulo: string;
}
