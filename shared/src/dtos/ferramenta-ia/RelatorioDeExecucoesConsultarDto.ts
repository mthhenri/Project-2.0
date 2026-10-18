import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

/**
 * Entrada da ferramenta `consultar_relatorio_de_execucoes` (gestor): um projeto e o período. Com `dataInicio` e `dataFim` é um
 * intervalo; com `ano` e `mes` é o mês; só com `ano`, o ano inteiro.
 */
export class RelatorioDeExecucoesConsultarDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  projetoId: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  ano?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  mes?: number;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataInicio?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dataFim?: string;
}

/** Total de uma pessoa ou de uma atividade no período. */
export interface TotalDoRelatorioDto {
  nome: string;
  minutos: number;
  execucoes: number;
}

/** O que a ferramenta `consultar_relatorio_de_execucoes` devolve à IA: só totais, sem as linhas. */
export interface RelatorioDeExecucoesConsultadoDto {
  projeto: string;
  periodo: string;
  dataInicio: string;
  dataFim: string;
  totalMinutos: number;
  totalExecucoes: number;
  porUsuario: TotalDoRelatorioDto[];
  /** As atividades com mais tempo no período. */
  porAtividade: TotalDoRelatorioDto[];
  haMaisAtividades: boolean;
}
