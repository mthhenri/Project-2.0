/** Data `yyyy-mm-dd` de um instante no fuso informado (o dia do chat segue o `APP_TIMEZONE`, não o do servidor). */
export function dataNoFuso(instante: Date, fusoHorario: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** O instante do dia útil anterior (pula sábado e domingo no fuso): a segunda-feira olha para a sexta. */
export function instanteDoDiaUtilAnterior(instante: Date, fusoHorario: string): Date {
  const formatoDoDiaDaSemana = new Intl.DateTimeFormat('en-US', { timeZone: fusoHorario, weekday: 'short' });
  let atual = new Date(instante.getTime());
  do {
    atual = new Date(atual.getTime() - 86_400_000);
  } while (['Sat', 'Sun'].includes(formatoDoDiaDaSemana.format(atual)));
  return atual;
}

/** Uma conversa por usuário por dia: `<usuarioId>-<yyyy-mm-dd>`. */
export function montarConversaId(usuarioId: number, instante: Date, fusoHorario: string): string {
  return `${usuarioId}-${dataNoFuso(instante, fusoHorario)}`;
}

const MESES_POR_EXTENSO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/**
 * O nome de uma conversa que ainda não tem nome gravado: "Chat do dia 19 de outubro de 2026". A data vem do fim do `conversaId`
 * (`<usuarioId>-<yyyy-mm-dd>`), sem passar por `Date`, então não há fuso nem virada de dia para errar.
 */
export function nomePadraoDaConversa(conversaId: string): string {
  const [ano, mes, dia] = conversaId.slice(-10).split('-').map(Number);
  return `Chat do dia ${dia} de ${MESES_POR_EXTENSO[mes - 1]} de ${ano}`;
}
