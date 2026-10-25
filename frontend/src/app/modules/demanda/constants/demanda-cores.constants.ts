import { TipoDemandaStatusEnum } from '@project20/shared';

/**
 * Cor de cada status, em tokens do tema (task 107): acompanha claro/escuro. É a **fonte única** da cor do status em toda a tela de demandas
 * (marca do status, borda do nó do grafo, chips da toolbar, legenda). Só vale em contexto CSS (`style`, custom property), nunca em atributo
 * de cor de biblioteca que exija hex.
 *
 * A planejada é azul-céu (task 238: a escolha do autor no canvas, mais legível que o ciano ao lado do verde da concluída).
 */
export const COR_NO_BORDA: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  'var(--app-surface-500)',
  [TipoDemandaStatusEnum.PLANEJADA]: 'var(--p-sky-500)',
  [TipoDemandaStatusEnum.CONCLUIDA]: 'var(--p-green-500)',
  [TipoDemandaStatusEnum.CANCELADA]: 'var(--p-red-400)',
};

/** O nome de cada status, o mesmo em todas as telas de demanda (tooltip, popover de troca, legenda e chips de filtro). */
export const ROTULO_STATUS_DEMANDA: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
  [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
  [TipoDemandaStatusEnum.CONCLUIDA]: 'Concluída',
  [TipoDemandaStatusEnum.CANCELADA]: 'Cancelada',
};

/** Os quatro status na ordem em que aparecem nas listas de escolha, cada um com o nome e a cor. */
export const OPCOES_STATUS_DEMANDA: ReadonlyArray<{ status: TipoDemandaStatusEnum; rotulo: string; cor: string }> = [
  TipoDemandaStatusEnum.PENDENTE,
  TipoDemandaStatusEnum.PLANEJADA,
  TipoDemandaStatusEnum.CONCLUIDA,
  TipoDemandaStatusEnum.CANCELADA,
].map((status) => ({ status, rotulo: ROTULO_STATUS_DEMANDA[status], cor: COR_NO_BORDA[status] }));

/** Preenchimento do nó: a cor do status diluída sobre a superfície do tema (escuro no escuro, claro no claro). */
export function corPreenchimentoNo(status: TipoDemandaStatusEnum): string {
  return `color-mix(in srgb, ${COR_NO_BORDA[status]} 22%, var(--app-surface-0))`;
}
