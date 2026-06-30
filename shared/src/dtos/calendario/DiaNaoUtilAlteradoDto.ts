import { TipoDiaNaoUtilEnum, TipoDiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilAlteradoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: TipoDiaNaoUtilEnum;
  duracao: TipoDiaNaoUtilDuracaoEnum;
  recorrente: boolean;
  createdDate: Date;
}
