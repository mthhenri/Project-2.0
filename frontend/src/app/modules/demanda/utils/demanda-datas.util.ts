export type AtalhoPrevisao = 'semana1' | 'semana2' | 'fimMes';

/** Data de hoje acrescida do atalho: +1 semana, +2 semanas ou o último dia do mês. */
export function dataDoAtalho(atalho: AtalhoPrevisao, hoje: Date = new Date()): Date {
  if (atalho === 'fimMes') return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + (atalho === 'semana1' ? 7 : 14));
}

/** `YYYY-MM-DD` no fuso local (formato que a API espera em `previsaoFimData`). */
export function formatarDataIso(data: Date): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** Converte o `previsaoFimData` da API (com ou sem hora) em `Date` ao meio-dia local. */
export function lerDataIso(texto: string): Date {
  return new Date(texto.slice(0, 10) + 'T12:00:00');
}
