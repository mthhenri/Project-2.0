import { ExecucaoResumoDto } from './ExecucaoResumoDto';

export class ExecucaoListaDto {
  itens: ExecucaoResumoDto[];
  totalItens: number;
  paginaAtual: number;
  itensPorPagina: number;
  totalPaginas: number;
  totalMinutosDia: number;
}
