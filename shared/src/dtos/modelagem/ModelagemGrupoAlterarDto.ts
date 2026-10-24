import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/** Renomeia um grupo (só gestor). O `id` vem da rota. */
export class ModelagemGrupoAlterarDto {
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
