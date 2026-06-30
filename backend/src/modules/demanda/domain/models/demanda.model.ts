import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoDemandaStatusEnum } from '@project20/shared';

export class Demanda extends BaseEntity {
  projetoId: number;
  demandaPaiId: number | null;
  nome: string;
  descricaoTecnica: string | null;
  descricaoCliente: string | null;
  documentacao: string | null;
  horasEstimadas: number;
  status: TipoDemandaStatusEnum;
  isEstrutural: boolean;
  previsaoFimData: Date | null;
}
