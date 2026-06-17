import { DemandaStatusEnum, DemandaPrioridadeEnum } from '@project20/shared';

export interface DemandaVisualizacao {
  id: number;
  nome: string;
  status: DemandaStatusEnum;
  prioridade: DemandaPrioridadeEnum;
  isEstrutural: boolean;
  horasEstimadas: number;
  demandaPaiId: number | null;
  projetoId: number;
}

export type ModoVisualizacao = 'grafo' | 'lista';
