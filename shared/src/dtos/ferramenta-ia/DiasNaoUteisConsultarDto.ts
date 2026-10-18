import { IsOptional, Matches } from 'class-validator';

/** Entrada da ferramenta `consultar_dias_nao_uteis`: o intervalo (`yyyy-mm-dd`); sem ele, os próximos 60 dias a partir de hoje. */
export class DiasNaoUteisConsultarDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataInicio?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataFim?: string;
}

/** Um feriado, recesso ou ponto facultativo dentro do intervalo. */
export interface DiaNaoUtilDaFerramentaDto {
  /** `yyyy-mm-dd` da ocorrência dentro do intervalo (os recorrentes valem todo ano). */
  data: string;
  descricao: string;
  tipo: string;
  duracao: string;
}

/** O que a ferramenta `consultar_dias_nao_uteis` devolve à IA. */
export interface DiasNaoUteisConsultadosDto {
  dataInicio: string;
  dataFim: string;
  dias: DiaNaoUtilDaFerramentaDto[];
  total: number;
  haMais: boolean;
}
