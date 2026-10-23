/**
 * Contrato do diagrama da modelagem do banco: o gerador (`npm run modelagem`, no backend) escreve este
 * formato em JSON e a tela Modelagem do frontend o lê. Não é uma resposta da API.
 */

/** `pk` chave primária, `fk` chave estrangeira, `lg` referência sem FK no banco (pelo nome da coluna), vazio nas demais. */
export type ModelagemMarcaColuna = 'pk' | 'fk' | 'lg' | '';

export interface ModelagemColuna {
  nome: string;
  /** Tipo já abreviado para exibição; termina em `?` quando a coluna aceita nulo. */
  tipo: string;
  marca: ModelagemMarcaColuna;
  /** Tabela apontada quando a marca é `fk` ou `lg`. */
  tabelaReferenciada: string | null;
}

export interface ModelagemTabela {
  nome: string;
  grupo: string;
  x: number;
  y: number;
  largura: number;
  colunas: ModelagemColuna[];
}

export interface ModelagemGrupo {
  id: string;
  titulo: string;
  rotulo: string;
}

export interface ModelagemDiagrama {
  /** De onde o diagrama veio (banco e última migration), para o cabeçalho da tela. */
  origem: string;
  /** Colunas que existem em toda tabela mas ficam fora do desenho (BaseEntity). */
  colunasOcultas: string[];
  avisos: string[];
  /** Na ordem da configuração: a posição define a cor do grupo. */
  grupos: ModelagemGrupo[];
  tabelas: ModelagemTabela[];
}
