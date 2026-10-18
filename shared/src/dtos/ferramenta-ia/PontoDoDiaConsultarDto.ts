import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Min } from 'class-validator';

/** Entrada da ferramenta `consultar_ponto_do_dia`: o dia (`yyyy-mm-dd`; sem ele, hoje) e, só para o gestor, de quem. */
export class PontoDoDiaConsultarDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  data?: string;

  /** Só o gestor pode pedir o ponto de outro usuário; sem ele, é o do próprio usuário. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usuarioId?: number;
}

/** O que a ferramenta `consultar_ponto_do_dia` devolve à IA (tudo em minutos). */
export interface PontoDoDiaConsultadoDto {
  data: string;
  usuario: string;
  ehDiaUtil: boolean;
  motivoNaoUtil: string | null;
  /** Meta do dia já descontada de justificativa. */
  metaMinutos: number;
  trabalhadosMinutos: number;
  /** Parte dos minutos trabalhados que conta como hora extra (fim de semana, feriado). */
  extraMinutos: number;
  /** Trabalhado menos a meta: negativo é o que falta. */
  saldoMinutos: number;
  totalExecucoes: number;
}
