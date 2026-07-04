import { TipoDemandaStatusEnum } from '@project20/shared';

export interface DemandaVisualizacao {
  id: number;
  nome: string;
  status: TipoDemandaStatusEnum;
  isEstrutural: boolean;
  horasEstimadas: number;
  demandaPaiId: number | null;
  projetoId: number;
}

export type ModoVisualizacao = 'grafo' | 'lista' | 'planejamento';
