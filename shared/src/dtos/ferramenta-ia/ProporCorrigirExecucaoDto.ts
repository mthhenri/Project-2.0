import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { MENSAGEM_CARACTERES_PROIBIDOS, REGEX_SEM_CARACTERES_PROIBIDOS } from '../../validators/caracteres-proibidos.validator';

/**
 * Entrada da ferramenta `propor_corrigir_execucao`: corrige o início, o fim e/ou a descrição de uma execução existente (id de
 * `listar_minhas_execucoes_do_dia`). As horas (`HH:mm`) valem no **dia do início da execução** e no fuso do sistema, salvo `data`
 * (`yyyy-mm-dd`) para mover o trecho de dia. Informe só o que muda.
 */
export class ProporCorrigirExecucaoDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  execucaoId: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaInicio?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaFim?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
  descricao?: string;
}

/** Os dados guardados na proposta: a entrada, o novo período em instantes (ISO), o de antes (para o desfazer) e os textos do cartão. */
export class PropostaCorrigirExecucaoDadosDto extends ProporCorrigirExecucaoDto {
  /** ISO 8601 do período novo. `novoFimData` é nulo se a execução segue em andamento. */
  @IsString()
  novoInicioData: string;

  @IsOptional()
  @IsString()
  novoFimData?: string | null;

  /** Como a execução estava antes da proposta. */
  @IsString()
  inicioAnteriorData: string;

  @IsOptional()
  @IsString()
  fimAnteriorData?: string | null;

  @IsOptional()
  @IsString()
  descricaoAnterior?: string;

  @IsOptional()
  @IsString()
  periodoAnteriorTexto?: string;

  @IsOptional()
  @IsString()
  periodoNovoTexto?: string;

  @IsOptional()
  @IsNumber()
  duracaoNovaMinutos?: number | null;

  @IsOptional()
  @IsString()
  atividadeNome?: string;

  @IsOptional()
  @IsString()
  demandaNome?: string;
}
