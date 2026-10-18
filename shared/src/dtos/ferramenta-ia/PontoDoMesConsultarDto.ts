import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Entrada da ferramenta `consultar_ponto_do_mes`: o mês (sem ele, o atual) e, só para o gestor, de quem. */
export class PontoDoMesConsultarDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Type(() => Number)
  ano?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes?: number;

  /** Só o gestor pode pedir o ponto de outro usuário; sem ele, é o do próprio usuário. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;
}

/** Um dia do mês em que houve trabalho ou justificativa. */
export interface PontoDoMesDiaDto {
  data: string;
  trabalhadosMinutos: number;
  saldoMinutos: number;
  justificativa: string | null;
}

/** O que a ferramenta `consultar_ponto_do_mes` devolve à IA (tudo em minutos). */
export interface PontoDoMesConsultadoDto {
  ano: number;
  mes: number;
  usuario: string;
  diasUteis: number;
  metaMinutos: number;
  trabalhadosMinutos: number;
  /** Trabalhado menos a meta do mês inteiro: negativo é o que falta. */
  saldoMinutos: number;
  /** Só os dias com trabalho ou justificativa. */
  dias: PontoDoMesDiaDto[];
}
