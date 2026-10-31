/** A divisão de uma área em duas colunas com a largura da primeira ajustável (task 289); medidas em px. */
export const DIVISAO = { padrao: 496, minima: 352, minimaDoOutro: 384, vao: 16, passoDoTeclado: 16 } as const;

export interface LimitesDaDivisao {
  /** A menor largura da primeira coluna. */
  minima: number;
  /** A menor largura que sobra para a segunda coluna. */
  minimaDoOutro: number;
}

/** A maior largura da primeira coluna: o que sobra depois do vão e da largura mínima da segunda (nunca abaixo da mínima). */
export function larguraMaximaDaPrimeira(larguraDaArea: number, limites: LimitesDaDivisao): number {
  return Math.max(limites.minima, larguraDaArea - DIVISAO.vao - limites.minimaDoOutro);
}

/** Mantém a largura entre o mínimo e o máximo da área; valor ilegível volta ao padrão (também limitado). Sem medida da área, só o mínimo vale. */
export function limitarLarguraDaPrimeira(largura: number, larguraDaArea: number, limites: LimitesDaDivisao): number {
  // Área ainda sem medida (fora do layout): só vale o mínimo.
  const maxima = larguraDaArea > 0 ? larguraMaximaDaPrimeira(larguraDaArea, limites) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(largura)) return Math.min(DIVISAO.padrao, maxima);
  return Math.min(maxima, Math.max(limites.minima, Math.round(largura)));
}

/** A largura da primeira coluna para a posição do ponteiro: a alça fica no meio do vão, então a coluna termina meio vão antes do ponteiro. */
export function larguraDaPrimeiraPeloPonteiro(ponteiroX: number, esquerdaDaArea: number, larguraDaArea: number, limites: LimitesDaDivisao): number {
  return limitarLarguraDaPrimeira(ponteiroX - esquerdaDaArea - DIVISAO.vao / 2, larguraDaArea, limites);
}
