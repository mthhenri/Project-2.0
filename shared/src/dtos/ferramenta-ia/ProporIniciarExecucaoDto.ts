import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_iniciar_execucao` e, com os campos de exibição, os dados da proposta `INICIAR_EXECUCAO`. A descrição
 * é a provisória (a formal vem no check-in). Se houver outra execução em andamento, ela é pausada antes.
 */
export class ProporIniciarExecucaoDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao: string;
}

/** Os dados guardados na proposta: a entrada mais nomes, só para o cartão mostrar. */
export class PropostaIniciarExecucaoDadosDto extends ProporIniciarExecucaoDto {
  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;

  /** A atividade da execução que será pausada para iniciar esta (se houver). */
  @IsOptional()
  @IsString()
  pausaraAtividadeNome?: string;
}
