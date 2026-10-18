import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';
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

  /**
   * Status em que a atividade passa a ficar ao iniciar, quando o usuário escolheu mudá-lo (ex.: de PENDENTE ou PLANEJADA para
   * DESENVOLVENDO). Sem ele, o status não muda: só vale para atividade já PLANEJADA ou DESENVOLVENDO.
   */
  @IsOptional()
  @IsIn([TipoAtividadeStatusEnum.PLANEJADA, TipoAtividadeStatusEnum.DESENVOLVENDO])
  novoStatus?: TipoAtividadeStatusEnum;
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

  /** Status da atividade antes de a proposta mudá-lo (só presente quando muda); serve ao cartão e ao desfazer. */
  @IsOptional()
  @IsEnum(TipoAtividadeStatusEnum)
  statusAnterior?: TipoAtividadeStatusEnum;
}
