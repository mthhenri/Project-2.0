/** O próximo check-in de um usuário: de qual execução é, quando foi sorteado e quando dispara. */
export interface AgendaDoCheckin {
  execucaoId: number;
  calculadaEm: Date;
  proximoEm: Date;
}

/** O que o cálculo precisa saber (tudo vem de fora, para a regra ser pura e testável). */
export interface EntradaDaAgenda {
  anterior: AgendaDoCheckin | null;
  /** A execução em andamento do usuário (id e início), ou `null`. */
  execucao: { id: number; inicio: Date } | null;
  suspenso: boolean;
  /** Quando o usuário voltou da última reunião (a conta recomeça dali), ou `null`. */
  retomadaEm: Date | null;
  agora: Date;
  minimoMinutos: number;
  maximoMinutos: number;
  /** Número em [0, 1): o sorteio. */
  aleatorio: number;
}

/** Um instante sorteado entre `minimo` e `maximo` minutos depois de `base` (se o máximo for menor que o mínimo, vale o mínimo). */
export function sortearProximoCheckin(base: Date, minimoMinutos: number, maximoMinutos: number, aleatorio: number): Date {
  const minimo = Math.max(1, minimoMinutos);
  const maximo = Math.max(minimo, maximoMinutos);
  const segundos = Math.round(minimo * 60 + aleatorio * (maximo - minimo) * 60);
  return new Date(base.getTime() + segundos * 1000);
}

/**
 * A agenda do check-in (task 161). Sem execução em andamento ou com os check-ins suspensos não há próximo check-in. Enquanto a execução
 * é a mesma, o horário sorteado fica (as consultas repetidas não o mudam). Execução nova (início, troca, trecho seguinte depois de um
 * check-in) ou volta da reunião sorteiam de novo, contando do início da execução ou da volta, o que vier depois: um check-in nunca cai
 * logo depois de um início.
 */
export function calcularAgenda(entrada: EntradaDaAgenda): AgendaDoCheckin | null {
  if (!entrada.execucao || entrada.suspenso) return null;
  const { anterior, execucao, retomadaEm } = entrada;
  const retomadaDepois = anterior !== null && retomadaEm !== null && anterior.calculadaEm.getTime() < retomadaEm.getTime();
  if (anterior && anterior.execucaoId === execucao.id && !retomadaDepois) return anterior;
  const base = retomadaEm && retomadaEm.getTime() > execucao.inicio.getTime() ? retomadaEm : execucao.inicio;
  return {
    execucaoId: execucao.id,
    calculadaEm: entrada.agora,
    proximoEm: sortearProximoCheckin(base, entrada.minimoMinutos, entrada.maximoMinutos, entrada.aleatorio),
  };
}

/** O check-in dispara agora: há agenda e o horário já passou. */
export function checkinDisparado(agenda: AgendaDoCheckin | null, agora: Date): boolean {
  return agenda !== null && agora.getTime() >= agenda.proximoEm.getTime();
}
