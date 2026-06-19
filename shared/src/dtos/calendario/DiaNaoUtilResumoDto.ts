import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilResumoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  duracao: DiaNaoUtilDuracaoEnum;
  recorrente: boolean;
}
