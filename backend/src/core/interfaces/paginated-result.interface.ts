export interface PaginatedResult<TItem> {
  itens: TItem[];
  totalItens: number;
  paginaAtual: number;
  itensPorPagina: number;
  totalPaginas: number;
}
