import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { TipoAtividadePrioridadeEnum } from '../../enums/tipo-atividade-prioridade.enum';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_criar_atividade` e, com os campos de exibição, os dados da proposta `CRIAR_ATIVIDADE`. A atividade
 * é sempre do usuário que confirma e nasce planejada.
 */
export class ProporCriarAtividadeDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  demandaId: number;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  nome: string;

  /**
   * Só o gestor: de quem é a atividade (`usuarioId` de `listar_usuarios`, só quando o usuário nomeia outra pessoa). Sem ele, é do próprio
   * usuário que confirma.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;

  /** Sem prioridade informada, a atividade nasce INDEFINIDA. */
  @IsOptional()
  @IsEnum(TipoAtividadePrioridadeEnum)
  prioridade?: TipoAtividadePrioridadeEnum;
}

/** Os dados guardados na proposta: a entrada mais o nome da demanda, só para o cartão mostrar. */
export class PropostaCriarAtividadeDadosDto extends ProporCriarAtividadeDto {
  @IsOptional()
  @IsString()
  demandaNome?: string;

  /** O dono da atividade, quando não é quem confirma. */
  @IsOptional()
  @IsString()
  usuarioNome?: string;
}
