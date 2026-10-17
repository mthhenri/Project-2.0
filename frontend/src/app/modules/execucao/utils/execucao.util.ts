/** Funções puras de apresentação do histórico de execuções (task 110). */

/** `Date` local → `yyyy-mm-dd`, o formato do filtro `data` da API e da URL. */
export function dataParaIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/** `yyyy-mm-dd` → `Date` local à meia-noite; `null` quando o texto não é uma data real. */
export function isoParaData(iso: string | null | undefined): Date | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!partes) return null;
  const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return dataParaIso(data) === iso ? data : null;
}

/** Mesmo dia civil (ignora a hora). */
export function mesmoDia(primeira: Date, segunda: Date): boolean {
  return dataParaIso(primeira) === dataParaIso(segunda);
}

/** "Quinta-feira, 10 de julho" (com o ano quando não é o ano corrente). */
export function rotuloDoDia(data: Date, hoje: Date = new Date()): string {
  const texto = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(data.getFullYear() !== hoje.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** 744 → "12h24"; 45 → "45min"; 0 → "0min". */
export function horasCompactas(totalMinutos: number): string {
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas === 0) return `${minutos}min`;
  return `${horas}h${String(minutos).padStart(2, '0')}`;
}

/** "Quinta-feira, 10 de julho · 5 execuções · 12h24". */
export function resumoDoDia(data: Date, totalExecucoes: number, totalMinutos: number, hoje: Date = new Date()): string {
  const partes = [rotuloDoDia(data, hoje)];
  partes.push(
    totalExecucoes === 0 ? 'Nenhuma execução' : `${totalExecucoes} ${totalExecucoes === 1 ? 'execução' : 'execuções'}`,
  );
  if (totalExecucoes > 0) partes.push(horasCompactas(totalMinutos));
  return partes.join(' · ');
}
