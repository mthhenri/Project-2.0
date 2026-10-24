/** Service → repository: a linha completa de `modelagem_tabela` (grupo e posição já decididos). */
export interface ModelagemTabelaInternoGravarDto {
  nomeTabela: string;
  grupoId: number;
  x: number;
  y: number;
}
