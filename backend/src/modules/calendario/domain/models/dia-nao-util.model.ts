import { BaseEntity } from '../../../../core/base/base.entity';
import { DiaNaoUtilTipoEnum } from '@project20/shared';

export class DiaNaoUtil extends BaseEntity {
  diaData: Date;
  descricao: string;
  tipo: DiaNaoUtilTipoEnum;
  recorrente: boolean;
}
