import { DiaNaoUtilTipoEnum } from '../../enums';

export class DiaNaoUtilResumoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  recorrente: boolean;
}
