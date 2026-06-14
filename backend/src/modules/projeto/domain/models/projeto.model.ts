import { BaseEntity } from '../../../../core/base/base.entity';
import { ProjetoStatusEnum } from '@project20/shared';

export class Projeto extends BaseEntity {
  nome: string;
  codigo: string;
  cor: string;
  status: ProjetoStatusEnum;
  inicioData: Date | null;
  previsaoFimData: Date | null;
}
