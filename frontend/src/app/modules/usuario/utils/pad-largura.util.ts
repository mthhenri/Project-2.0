/** Larguras do drawer do pad, em px (task 256): o padrão é a largura de antes de ser ajustável. */
export const LARGURA_DO_PAD = { padrao: 520, minima: 380, margemDaJanela: 120, passoDoTeclado: 16 } as const;

/** A maior largura do pad: a da janela menos a margem que deixa o resto da tela à vista (nunca abaixo da mínima). */
export function larguraMaximaDoPad(larguraDaJanela: number): number {
  return Math.max(LARGURA_DO_PAD.minima, larguraDaJanela - LARGURA_DO_PAD.margemDaJanela);
}

/** Mantém a largura entre o mínimo e o máximo da janela; valor ilegível volta ao padrão. */
export function limitarLarguraDoPad(largura: number, larguraDaJanela: number): number {
  if (!Number.isFinite(largura)) return Math.min(LARGURA_DO_PAD.padrao, larguraMaximaDoPad(larguraDaJanela));
  return Math.min(larguraMaximaDoPad(larguraDaJanela), Math.max(LARGURA_DO_PAD.minima, Math.round(largura)));
}

/** A largura para a posição do ponteiro: o drawer fica à direita, então ele ocupa o que sobra depois do ponteiro. */
export function larguraDoPadPeloPonteiro(ponteiroX: number, larguraDaJanela: number): number {
  return limitarLarguraDoPad(larguraDaJanela - ponteiroX, larguraDaJanela);
}
