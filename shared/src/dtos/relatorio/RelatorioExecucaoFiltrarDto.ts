/**
 * Filtro interno do repositório — período já resolvido em datas concretas pelo service.
 * Como o relatório é gestor-only, não há restrição por usuário: só projeto + intervalo.
 */
export class RelatorioExecucaoFiltrarDto {
  projetoId: number;
  dataInicio: string; // YYYY-MM-DD
  dataFim: string;    // YYYY-MM-DD
}
