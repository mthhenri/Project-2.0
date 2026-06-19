import { DiaNaoUtilTipoEnum } from '../../enums/dia-nao-util-tipo.enum';
import { DiaNaoUtilDuracaoEnum } from '../../enums/dia-nao-util-duracao.enum';

export class CalendarioDiaNaoUtilMesDto {
  dia: number;
  tipo: DiaNaoUtilTipoEnum;
  duracao: DiaNaoUtilDuracaoEnum;
}
