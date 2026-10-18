import { IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_criar_projeto` e, igual, os dados da proposta `CRIAR_PROJETO`. O projeto nasce ATIVO. Sem código, a
 * ferramenta deriva um do nome (iniciais em maiúsculas); sem cor, escolhe uma da paleta.
 */
export class ProporCriarProjetoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome: string;

  /** Único entre os projetos; vem em maiúsculas. */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  codigo?: string;

  /** Cor em hexadecimal, como `#6366f1`. */
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  cor?: string;

  @IsOptional()
  @IsDateString()
  inicioData?: string;

  @IsOptional()
  @IsDateString()
  previsaoFimData?: string;
}
