import { DiaNaoUtilTipoEnum } from '../../enums';

export class DiaNaoUtilCriadoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  recorrente: boolean;
  createdDate: Date;
}
