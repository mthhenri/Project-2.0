import { ModelagemGrupoDto } from './ModelagemGrupoDto';
import { ModelagemTabelaDto } from './ModelagemTabelaDto';

/** O diagrama da modelagem do banco, lido do catálogo do PostgreSQL (tela Modelagem; sem parâmetros de entrada). */
export interface ModelagemDiagramaDto {
  /** De onde o diagrama veio (última migration aplicada), para o cabeçalho da tela. */
  origem: string;
  /** Colunas que existem em toda tabela mas ficam fora do desenho (BaseEntity). */
  colunasOcultas: string[];
  avisos: string[];
  /** Na ordem da configuração: a posição define a cor do grupo. */
  grupos: ModelagemGrupoDto[];
  tabelas: ModelagemTabelaDto[];
}
