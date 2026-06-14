import { DiaNaoUtilTipoEnum } from '../../enums';

export class DiaNaoUtilAlteradoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  recorrente: boolean;
  createdDate: Date;
}
