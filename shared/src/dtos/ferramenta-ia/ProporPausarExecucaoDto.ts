import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_pausar_execucao` e, com os campos de exibição, os dados da proposta `PAUSAR_EXECUCAO`. Pausa a execução
 * em andamento do usuário; `descricao` (opcional) descreve o trabalho feito até ali, e sem ela vale a provisória.
 */
export class ProporPausarExecucaoDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao?: string;
}

/** Os dados guardados na proposta: a entrada mais nomes, só para o cartão mostrar. */
export class PropostaPausarExecucaoDadosDto extends ProporPausarExecucaoDto {
  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;
}
