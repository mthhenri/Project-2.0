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

/** As três visões da tela. `lista` era o nome da Árvore (task 239): o valor antigo ainda é aceito na URL e no que foi lembrado. */
export type ModoVisualizacao = 'grafo' | 'arvore' | 'planejamento';
