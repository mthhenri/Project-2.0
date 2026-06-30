import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoDiaNaoUtilEnum, TipoDiaNaoUtilDuracaoEnum } from '@project20/shared';

export class DiaNaoUtil extends BaseEntity {
  diaData: Date;
  descricao: string;
  tipo: TipoDiaNaoUtilEnum;
  duracao: TipoDiaNaoUtilDuracaoEnum;
  recorrente: boolean;
}
