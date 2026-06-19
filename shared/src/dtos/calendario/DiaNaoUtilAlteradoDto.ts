import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '../../enums';

export class DiaNaoUtilAlteradoDto {
  id: number;
  diaData: string;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  duracao: DiaNaoUtilDuracaoEnum;
  recorrente: boolean;
  createdDate: Date;
}
