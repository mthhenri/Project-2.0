import { ModelagemColunaDto } from './ModelagemColunaDto';

export interface ModelagemTabelaDto {
  nome: string;
  /** `null` = a tabela existe no banco mas não está na modelagem: aparece no canto do diagrama, em "Fora da modelagem". */
  grupoId: number | null;
  x: number;
  y: number;
  largura: number;
  colunas: ModelagemColunaDto[];
}
