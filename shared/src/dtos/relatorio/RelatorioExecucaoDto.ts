import { RelatorioPeriodoTipoEnum } from '../../enums/relatorio-periodo-tipo.enum';
import { RelatorioExecucaoLinhaDto } from './RelatorioExecucaoLinhaDto';

/** Relatório de execuções de um projeto por período — recorte computado. */
export class RelatorioExecucaoDto {
  projetoId: number;
  nomeProjeto: string;
  periodoTipo: RelatorioPeriodoTipoEnum;
  periodoDescricao: string;   // ex.: "Ano 2026", "Junho/2026", "01/01/2026 a 30/06/2026"
  dataInicio: string;         // YYYY-MM-DD (resolvido)
  dataFim: string;            // YYYY-MM-DD (resolvido)
  totalExecucoes: number;
  totalMinutos: number;
  linhas: RelatorioExecucaoLinhaDto[];
}
