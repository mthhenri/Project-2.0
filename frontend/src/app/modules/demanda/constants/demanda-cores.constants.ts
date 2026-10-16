import { TipoDemandaStatusEnum } from '@project20/shared';

/**
 * Cor de cada status, em tokens do tema (task 107): acompanha claro/escuro. Usada na borda do nó do grafo,
 * nos chips da toolbar e na legenda. Só vale em contexto CSS (`style`, custom property), nunca em atributo
 * de cor de biblioteca que exija hex.
 */
export const COR_NO_BORDA: Record<TipoDemandaStatusEnum, string> = {
  [TipoDemandaStatusEnum.PENDENTE]:  'var(--app-surface-500)',
  [TipoDemandaStatusEnum.PLANEJADA]: 'var(--p-cyan-500)',
  [TipoDemandaStatusEnum.CONCLUIDA]: 'var(--p-green-500)',
  [TipoDemandaStatusEnum.CANCELADA]: 'var(--p-red-400)',
};

/** Preenchimento do nó: a cor do status diluída sobre a superfície do tema (escuro no escuro, claro no claro). */
export function corPreenchimentoNo(status: TipoDemandaStatusEnum): string {
  return `color-mix(in srgb, ${COR_NO_BORDA[status]} 22%, var(--app-surface-0))`;
}
