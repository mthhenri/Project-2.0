/** Quanto tempo, depois de resolvida, uma proposta da IA ainda pode ser desfeita (task 194). */
export const PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS = 30;

const MILISSEGUNDOS_POR_MINUTO = 60_000;

/** O instante em que o prazo de desfazer acaba; `null` quando a proposta não tem data de resolução. */
export function limiteParaDesfazerProposta(resolucaoData: Date | string | null | undefined): Date | null {
  if (!resolucaoData) return null;
  const resolvidaEm = new Date(resolucaoData);
  if (Number.isNaN(resolvidaEm.getTime())) return null;
  return new Date(resolvidaEm.getTime() + PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS * MILISSEGUNDOS_POR_MINUTO);
}

/** Ainda dentro do prazo (o limite, exato, ainda vale). Sem data de resolução não há como medir: vale. */
export function podeDesfazerProposta(resolucaoData: Date | string | null | undefined, agora: Date = new Date()): boolean {
  const limite = limiteParaDesfazerProposta(resolucaoData);
  return limite === null || agora.getTime() <= limite.getTime();
}
