import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum } from '@project20/shared';

export class Atividade extends BaseEntity {
  demandaId: number;
  usuarioId: number;
  nome: string;
  status: TipoAtividadeStatusEnum;
  prioridade: TipoAtividadePrioridadeEnum;
}
