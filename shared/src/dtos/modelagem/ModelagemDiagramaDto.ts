import { ModelagemGrupoDto } from './ModelagemGrupoDto';
import { ModelagemTabelaDto } from './ModelagemTabelaDto';

/** O diagrama da modelagem do banco: o catálogo do PostgreSQL mais os grupos e as posições que o gestor definiu (tela Modelagem). */
export interface ModelagemDiagramaDto {
  /** De onde o diagrama veio (última migration aplicada), para o cabeçalho da tela. */
  origem: string;
  /** Colunas que existem em toda tabela mas ficam fora do desenho (BaseEntity). */
  colunasOcultas: string[];
  avisos: string[];
  /** Na ordem escolhida (`ordem`); os grupos sem tabela também vêm, para o gestor poder usá-los ou excluí-los. */
  grupos: ModelagemGrupoDto[];
  tabelas: ModelagemTabelaDto[];
}
