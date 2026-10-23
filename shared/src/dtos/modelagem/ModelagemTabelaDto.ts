import { ModelagemColunaDto } from './ModelagemColunaDto';

export interface ModelagemTabelaDto {
  nome: string;
  grupo: string;
  x: number;
  y: number;
  largura: number;
  colunas: ModelagemColunaDto[];
}
