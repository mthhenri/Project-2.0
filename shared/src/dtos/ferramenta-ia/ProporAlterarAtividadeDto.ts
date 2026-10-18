import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { TipoAtividadePrioridadeEnum } from '../../enums/tipo-atividade-prioridade.enum';
import { TipoAtividadeStatusEnum } from '../../enums/tipo-atividade-status.enum';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_alterar_atividade` e, com os campos de exibição, os dados da proposta `ALTERAR_ATIVIDADE`. Ao menos um
 * entre `status`, `prioridade` e `nome` deve mudar a atividade (a ferramenta confere); o que não muda fica de fora.
 */
export class ProporAlterarAtividadeDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  @IsOptional()
  @IsEnum(TipoAtividadeStatusEnum)
  status?: TipoAtividadeStatusEnum;

  @IsOptional()
  @IsEnum(TipoAtividadePrioridadeEnum)
  prioridade?: TipoAtividadePrioridadeEnum;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome?: string;
}

/** Os dados guardados na proposta: a entrada mais os nomes e os valores de antes, para o cartão mostrar o antes e o depois e para o desfazer. */
export class PropostaAlterarAtividadeDadosDto extends ProporAlterarAtividadeDto {
  /** O nome da atividade antes da proposta. */
  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;

  /** Só presentes nos campos que a proposta muda. */
  @IsOptional()
  @IsEnum(TipoAtividadeStatusEnum)
  statusAnterior?: TipoAtividadeStatusEnum;

  @IsOptional()
  @IsEnum(TipoAtividadePrioridadeEnum)
  prioridadeAnterior?: TipoAtividadePrioridadeEnum;
}
