import { BaseEntity } from '../../../../core/base/base.entity';

export class Execucao extends BaseEntity {
  atividadeId: number;
  descricao: string;
  inicioData: Date;
  fimData: Date | null;
}
