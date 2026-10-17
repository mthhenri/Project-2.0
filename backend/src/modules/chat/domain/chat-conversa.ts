/** Data `yyyy-mm-dd` de um instante no fuso informado (o dia do chat segue o `APP_TIMEZONE`, não o do servidor). */
export function dataNoFuso(instante: Date, fusoHorario: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: fusoHorario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instante);
}

/** Uma conversa por usuário por dia: `<usuarioId>-<yyyy-mm-dd>`. */
export function montarConversaId(usuarioId: number, instante: Date, fusoHorario: string): string {
  return `${usuarioId}-${dataNoFuso(instante, fusoHorario)}`;
}
