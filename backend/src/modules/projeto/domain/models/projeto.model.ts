import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoProjetoStatusEnum } from '@project20/shared';

export class Projeto extends BaseEntity {
  nome: string;
  codigo: string;
  cor: string;
  status: TipoProjetoStatusEnum;
  inicioData: string | null;
  previsaoFimData: string | null;
}
