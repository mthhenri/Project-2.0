import { BaseEntity } from '../../../../core/base/base.entity';
import { AtividadeStatusEnum } from '@project20/shared';

export class Atividade extends BaseEntity {
  demandaId: number;
  usuarioId: number;
  nome: string;
  descricao: string | null;
  status: AtividadeStatusEnum;
}
