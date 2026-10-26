import { TipoDemandaStatusEnum } from '../enums/tipo-demanda-status.enum';

/** Há quantos dias sem execução uma demanda em andamento é considerada parada (task 240). */
export const PRAZO_DEMANDA_PARADA_DIAS = 7;

const MILISSEGUNDOS_POR_DIA = 86_400_000;

export interface DemandaParadaEntrada {
  status: TipoDemandaStatusEnum;
  horasEstimadas: number;
  /** Última execução das atividades diretas da demanda; `null` se nunca foi executada. */
  ultimaExecucaoData: Date | string | null;
  criadaData: Date | string;
}

/** Os dias inteiros que se passaram desde `data`; `null` se a data for inválida. */
function diasDesde(data: Date | string, agora: Date): number | null {
  const instante = new Date(data).getTime();
  return Number.isNaN(instante) ? null : (agora.getTime() - instante) / MILISSEGUNDOS_POR_DIA;
}

/**
 * Demanda parada: tem estimativa, não está concluída nem cancelada e está sem execução há **mais de** 7 dias — ou nunca foi executada e foi
 * criada há mais de 7. Os 7 dias exatos ainda não contam.
 */
export function demandaEstaParada(entrada: DemandaParadaEntrada, agora: Date = new Date()): boolean {
  if (entrada.status === TipoDemandaStatusEnum.CONCLUIDA || entrada.status === TipoDemandaStatusEnum.CANCELADA) return false;
  if (!(entrada.horasEstimadas > 0)) return false;
  const dias = diasDesde(entrada.ultimaExecucaoData ?? entrada.criadaData, agora);
  return dias !== null && dias > PRAZO_DEMANDA_PARADA_DIAS;
}
