import { TipoAtividadeStatusEnum } from '@project20/shared';

/** Uma atividade do checklist como a demanda aberta a mostra. */
export interface ItemDoChecklist {
  id: number;
  nome: string;
  status: TipoAtividadeStatusEnum;
  emExecucao: boolean;
  minutosExecutados: number;
  totalExecucoes: number;
}

/** "2 de 5 desenvolvidas"; demanda sem atividade diz isso em vez de "0 de 0". */
export function rotuloDesenvolvidas(desenvolvidas: number, total: number): string {
  return total === 0 ? 'Sem atividades' : `${desenvolvidas} de ${total} desenvolvidas`;
}

/** O percentual (0 a 100) das atividades desenvolvidas. */
export function percentualDesenvolvidas(desenvolvidas: number, total: number): number {
  return total === 0 ? 0 : Math.min(100, Math.round((desenvolvidas / total) * 100));
}

/**
 * A ordem do checklist: as desenvolvidas primeiro (riscadas), depois a que está rodando e por fim as que faltam; dentro de cada grupo
 * a ordem que a API trouxe (prioridade) se mantém.
 */
export function ordenarChecklist(itens: readonly ItemDoChecklist[]): ItemDoChecklist[] {
  const grupo = (item: ItemDoChecklist): number => (item.status === TipoAtividadeStatusEnum.DESENVOLVIDA ? 0 : item.emExecucao ? 1 : 2);
  return itens.map((item, indice) => ({ item, indice })).sort((a, b) => grupo(a.item) - grupo(b.item) || a.indice - b.indice).map(({ item }) => item);
}
