/** `pk` chave primária, `fk` chave estrangeira, `lg` referência sem FK no banco (inferida pelo nome da coluna), vazio nas demais. */
export type ModelagemMarcaColuna = 'pk' | 'fk' | 'lg' | '';

export interface ModelagemColunaDto {
  nome: string;
  /** Tipo já abreviado para exibição; termina em `?` quando a coluna aceita nulo. */
  tipo: string;
  marca: ModelagemMarcaColuna;
  /** Tabela apontada quando a marca é `fk` ou `lg`. */
  tabelaReferenciada: string | null;
}
