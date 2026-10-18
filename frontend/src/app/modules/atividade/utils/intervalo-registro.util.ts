/** Intervalo de uma execução registrada à mão: o fim e o início, ambos já resolvidos para o relógio local. */
export interface IntervaloRegistro {
  inicioData: Date;
  fimData: Date;
}

/** Atalhos de duração do dialog "Registrar execução": terminam em `agora` e voltam `minutos`. */
export const DURACOES_REGISTRO = [
  { rotulo: '30min', minutos: 30 },
  { rotulo: '1h', minutos: 60 },
  { rotulo: '2h', minutos: 120 },
  { rotulo: '4h', minutos: 240 },
] as const;

/** O trabalho que acabou agora e durou `minutos` (o padrão do dialog é 1h). */
export function intervaloRetroativo(agora: Date, minutos: number): IntervaloRegistro {
  const fimData = new Date(agora);
  fimData.setSeconds(0, 0);
  return { inicioData: new Date(fimData.getTime() - minutos * 60_000), fimData };
}

/** A manhã de hoje (09:00–12:00), para quem esqueceu de registrar o começo do dia. */
export function intervaloDaManha(agora: Date): IntervaloRegistro {
  const inicioData = new Date(agora);
  inicioData.setHours(9, 0, 0, 0);
  const fimData = new Date(agora);
  fimData.setHours(12, 0, 0, 0);
  return { inicioData, fimData };
}

/** Quantos minutos o intervalo cobre; serve para destacar o atalho que já está aplicado. */
export function minutosDoIntervalo(intervalo: IntervaloRegistro | null): number | null {
  if (!intervalo) return null;
  return Math.round((intervalo.fimData.getTime() - intervalo.inicioData.getTime()) / 60_000);
}
