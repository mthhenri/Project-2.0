import { TipoDiaNaoUtilEnum } from '../../enums/tipo-dia-nao-util.enum';
import { TipoDiaNaoUtilDuracaoEnum } from '../../enums/tipo-dia-nao-util-duracao.enum';

export class CalendarioDiaNaoUtilMesDto {
  dia: number;
  tipo: TipoDiaNaoUtilEnum;
  duracao: TipoDiaNaoUtilDuracaoEnum;
}
