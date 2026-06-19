import { BaseEntity } from '../../../../core/base/base.entity';
import { DiaNaoUtilTipoEnum, DiaNaoUtilDuracaoEnum } from '@project20/shared';

export class DiaNaoUtil extends BaseEntity {
  diaData: Date;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  duracao: DiaNaoUtilDuracaoEnum;
  recorrente: boolean;
}
