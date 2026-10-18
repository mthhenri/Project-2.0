import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_registrar_execucao` (gestor): um trecho de trabalho já encerrado numa atividade, dado como dia e horas
 * **no fuso do sistema** (`yyyy-mm-dd`, `HH:mm`). A IA resolve "ontem" e "das 14h às 16h" em datas exatas; o sistema converte para
 * instantes e mostra o período no cartão antes de confirmar.
 */
export class ProporRegistrarExecucaoDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  atividadeId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim: string;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao: string;
}

/** Os dados guardados na proposta: a entrada, o período já em instantes (ISO) e os textos que o cartão mostra. */
export class PropostaRegistrarExecucaoDadosDto extends ProporRegistrarExecucaoDto {
  /** ISO 8601 do início e do fim, no fuso do sistema já resolvido. */
  @IsString()
  inicioData: string;

  @IsString()
  fimData: string;

  /** Ex.: `18/10/2026, 14:00 às 16:00` (no fuso do sistema). */
  @IsOptional()
  @IsString()
  periodoTexto?: string;

  @IsOptional()
  @IsNumber()
  duracaoMinutos?: number;

  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;

  /** O dono da atividade (de quem é a execução). */
  @IsOptional()
  @IsString()
  usuarioNome?: string;
}
