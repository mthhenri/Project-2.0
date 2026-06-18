/** Abreviações dos dias da semana, em português, indexadas por `getUTCDay()`. */
const DIAS_DA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Formata um saldo de minutos com sinal explícito (ex.: "+1h 30min", "-0h 45min").
 * Não reaproveita o pipe de horas porque minutos negativos produziriam componentes
 * confusos (ex.: "-2h -30min").
 */
export function formatarSaldoMinutos(saldoMinutos: number): string {
  const sinal = saldoMinutos >= 0 ? '+' : '-';
  const absoluto = Math.abs(saldoMinutos);
  const horas = Math.floor(absoluto / 60);
  const minutos = absoluto % 60;
  return `${sinal}${horas}h ${minutos}min`;
}

/** Retorna a abreviação do dia da semana (Seg, Ter, ...) de uma data ISO `YYYY-MM-DD`. */
export function abreviacaoDiaSemana(dataIso: string): string {
  return DIAS_DA_SEMANA[new Date(dataIso).getUTCDay()];
}

/** Retorna o número do dia do mês de uma data ISO `YYYY-MM-DD`. */
export function numeroDoDia(dataIso: string): number {
  return new Date(dataIso).getUTCDate();
}
