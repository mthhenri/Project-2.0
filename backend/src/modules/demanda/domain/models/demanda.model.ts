import { BaseEntity } from '../../../../core/base/base.entity';
import { DemandaStatusEnum, DemandaPrioridadeEnum } from '@project20/shared';

export class Demanda extends BaseEntity {
  projetoId: number;
  demandaPaiId: number | null;
  nome: string;
  descricaoTecnica: string | null;
  descricaoCliente: string | null;
  documentacao: string | null;
  horasEstimadas: number;
  prioridade: DemandaPrioridadeEnum;
  status: DemandaStatusEnum;
  isEstrutural: boolean;
  previsaoFimData: Date | null;
  ordemExibicao: number;
}
