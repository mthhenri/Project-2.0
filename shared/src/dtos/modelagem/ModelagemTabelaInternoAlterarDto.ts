/** Controller → service: o corpo de `ModelagemTabelaAlterarDto` mais o nome da tabela da rota. Campo ausente = manter. */
export interface ModelagemTabelaInternoAlterarDto {
  nomeTabela: string;
  grupoId?: number;
  x?: number;
  y?: number;
}
