/**
 * Calcula os segundos decorridos entre `inicioData` e o instante atual.
 * Nunca retorna valor negativo (protege contra relógio do cliente atrasado).
 */
export function segundosDecorridos(inicioData: Date | string): number {
  const inicio = new Date(inicioData).getTime();
  const agora = Date.now();
  const segundos = Math.floor((agora - inicio) / 1000);
  return segundos > 0 ? segundos : 0;
}

/**
 * Formata uma quantidade de segundos no formato de relógio `HH:mm:ss`.
 */
export function formatarRelogio(totalSegundos: number): string {
  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;
  return [horas, minutos, segundos].map((parte) => String(parte).padStart(2, '0')).join(':');
}
