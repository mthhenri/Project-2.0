import { ModelagemColunaDto } from './ModelagemColunaDto';

export interface ModelagemTabelaDto {
  nome: string;
  /** `null` = "Sem grupo". */
  grupoId: number | null;
  x: number;
  y: number;
  largura: number;
  colunas: ModelagemColunaDto[];
}
