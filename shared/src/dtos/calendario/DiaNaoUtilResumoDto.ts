import { TipoDiaNaoUtilEnum, TipoDiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilResumoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: TipoDiaNaoUtilEnum;
  duracao: TipoDiaNaoUtilDuracaoEnum;
  recorrente: boolean;
}
