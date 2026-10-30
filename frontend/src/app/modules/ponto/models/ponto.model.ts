import { PontoDiaResumoDto } from '@project20/shared';

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

// ---------------------------------------------------------------------------
// Linha do dia (P-054): períodos e intervalos em resumo, cor do intervalo e alertas
// ---------------------------------------------------------------------------

/** Cor do intervalo conforme o quanto ele se afasta de 1h a 1h30 (o esperado): cada 15 min de desvio sobe uma faixa. */
export type FaixaIntervalo = 'ESPERADO' | 'ATENCAO' | 'ALERTA' | 'CRITICO';

export const INTERVALO_ESPERADO_MINIMO_MINUTOS = 60;
export const INTERVALO_ESPERADO_MAXIMO_MINUTOS = 90;
const PASSO_DA_FAIXA_MINUTOS = 15;

/** Verde de 1h a 1h30; amarelo até 15 min fora disso; laranja até 30; vermelho além (ex.: 29 min ou 2h01 são vermelhos). */
export function faixaDoIntervalo(duracaoMinutos: number): FaixaIntervalo {
  const desvio =
    duracaoMinutos < INTERVALO_ESPERADO_MINIMO_MINUTOS
      ? INTERVALO_ESPERADO_MINIMO_MINUTOS - duracaoMinutos
      : Math.max(0, duracaoMinutos - INTERVALO_ESPERADO_MAXIMO_MINUTOS);
  if (desvio === 0) return 'ESPERADO';
  if (desvio <= PASSO_DA_FAIXA_MINUTOS) return 'ATENCAO';
  if (desvio <= PASSO_DA_FAIXA_MINUTOS * 2) return 'ALERTA';
  return 'CRITICO';
}

/** Descrição da faixa para o tooltip (a cor sozinha não pode carregar o significado). */
export function descricaoDaFaixa(faixa: FaixaIntervalo): string {
  switch (faixa) {
    case 'ESPERADO': return 'Dentro do esperado (1h a 1h30)';
    case 'ATENCAO': return 'Até 15 min fora do esperado (1h a 1h30)';
    case 'ALERTA': return 'Entre 15 e 30 min fora do esperado (1h a 1h30)';
    case 'CRITICO': return 'Mais de 30 min fora do esperado (1h a 1h30)';
  }
}

export interface SegmentoDoDia {
  tipo: 'PERIODO' | 'INTERVALO';
  /** "Manhã", "Tarde 2", "Intervalo", "1º intervalo"... */
  rotulo: string;
  inicioData: Date;
  /** `null` só no último período de um dia com execução em andamento. */
  fimData: Date | null;
  /** Só nos intervalos. */
  duracaoMinutos: number | null;
  faixa: FaixaIntervalo | null;
}

type EntradaDosSegmentos = Pick<PontoDiaResumoDto, 'primeiroInicioData' | 'ultimoFimData' | 'intervalos'>;

/** Hora cheia (0 a 23) de um instante no fuso do sistema, o mesmo em que a tela exibe os horários. */
function horaNoFuso(instante: Date, fuso: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: fuso }).format(instante));
}

function nomeDoPeriodo(inicioData: Date, fuso: string): string {
  const hora = horaNoFuso(inicioData, fuso);
  if (hora < 12) return 'Manhã';
  return hora < 18 ? 'Tarde' : 'Noite';
}

/**
 * Períodos de trabalho e intervalos do dia em ordem. Os intervalos (lacunas entre execuções) dividem o dia: cada trecho entre eles é um
 * período, chamado Manhã, Tarde ou Noite pelo horário em que começa, no `fuso` do sistema (repetidos ganham número: "Tarde 1", "Tarde 2"; sem intervalo, "Dia todo").
 */
export function montarSegmentosDoDia(dia: EntradaDosSegmentos, fuso: string): SegmentoDoDia[] {
  if (!dia.primeiroInicioData) return [];
  const intervalos = [...(dia.intervalos ?? [])]
    .map((intervalo) => ({ ...intervalo, inicioData: new Date(intervalo.inicioData), fimData: new Date(intervalo.fimData) }))
    .sort((a, b) => a.inicioData.getTime() - b.inicioData.getTime());

  const periodos: Array<{ inicioData: Date; fimData: Date | null }> = [];
  const intervalosUsados: typeof intervalos = [];
  let cursor = new Date(dia.primeiroInicioData);
  for (const intervalo of intervalos) {
    if (intervalo.inicioData.getTime() <= cursor.getTime()) continue;
    periodos.push({ inicioData: cursor, fimData: intervalo.inicioData });
    intervalosUsados.push(intervalo);
    cursor = intervalo.fimData;
  }
  periodos.push({ inicioData: cursor, fimData: dia.ultimoFimData ? new Date(dia.ultimoFimData) : null });

  const base = periodos.map((periodo) => nomeDoPeriodo(periodo.inicioData, fuso));
  const total = new Map<string, number>();
  for (const nome of base) total.set(nome, (total.get(nome) ?? 0) + 1);
  const sequencia = new Map<string, number>();
  const rotulos = base.map((nome) => {
    if (periodos.length === 1) return 'Dia todo';
    sequencia.set(nome, (sequencia.get(nome) ?? 0) + 1);
    return total.get(nome)! > 1 ? `${nome} ${sequencia.get(nome)}` : nome;
  });

  const segmentos: SegmentoDoDia[] = [];
  periodos.forEach((periodo, indice) => {
    if (indice > 0) {
      const intervalo = intervalosUsados[indice - 1];
      segmentos.push({
        tipo: 'INTERVALO',
        rotulo: intervalosUsados.length > 1 ? `${indice}º intervalo` : 'Intervalo',
        inicioData: intervalo.inicioData,
        fimData: intervalo.fimData,
        duracaoMinutos: intervalo.duracaoMinutos,
        faixa: faixaDoIntervalo(intervalo.duracaoMinutos),
      });
    }
    segmentos.push({ tipo: 'PERIODO', rotulo: rotulos[indice], inicioData: periodo.inicioData, fimData: periodo.fimData, duracaoMinutos: null, faixa: null });
  });
  return segmentos;
}

// Limites de referência da CLT (CF art. 7º, XIII; CLT arts. 58 e 59): jornada de 8h e até 2h extras por dia, e 10 min de tolerância na marcação.
export const LIMITE_DIARIO_MINUTOS = 10 * 60;
export const TOLERANCIA_DE_FALTA_MINUTOS = 10;

export interface AlertaDoDia {
  tipo: 'HORA_A_MENOS' | 'LIMITE_DIARIO';
  gravidade: 'AVISO' | 'ERRO';
  texto: string;
  descricao: string;
}

type EntradaDosAlertas = Pick<
  PontoDiaResumoDto,
  'data' | 'ehDiaUtil' | 'totalMinutosTrabalhados' | 'saldoMinutos' | 'metaMinutos' | 'justificativaNome'
>;

/** Duração sem sinal no formato do restante da tela ("1h 20min"). */
export function formatarDuracaoMinutos(minutos: number): string {
  return `${Math.floor(minutos / 60)}h ${minutos % 60}min`;
}

/**
 * Alertas da linha: hora a menos em dia útil já encerrado e sem justificativa (mais de 10 min abaixo da meta) e excesso sobre o limite diário
 * (mais de 10h trabalhadas, em qualquer dia). O dia de hoje ainda está em curso, então nunca tem "hora a menos".
 */
export function alertasDoDia(dia: EntradaDosAlertas, hojeIso: string): AlertaDoDia[] {
  const alertas: AlertaDoDia[] = [];
  const encerrado = dia.data.slice(0, 10) < hojeIso;
  const falta = -dia.saldoMinutos;
  if (dia.ehDiaUtil && encerrado && !dia.justificativaNome && falta > TOLERANCIA_DE_FALTA_MINUTOS) {
    alertas.push({
      tipo: 'HORA_A_MENOS',
      gravidade: 'AVISO',
      texto: `Faltaram ${formatarDuracaoMinutos(falta)}`,
      descricao: `Dia útil encerrado com ${formatarDuracaoMinutos(dia.totalMinutosTrabalhados)} trabalhadas, meta de ${formatarDuracaoMinutos(dia.metaMinutos)} e sem justificativa.`,
    });
  }
  if (dia.totalMinutosTrabalhados > LIMITE_DIARIO_MINUTOS) {
    alertas.push({
      tipo: 'LIMITE_DIARIO',
      gravidade: 'ERRO',
      texto: `Acima de 10h (+${formatarDuracaoMinutos(dia.totalMinutosTrabalhados - LIMITE_DIARIO_MINUTOS)})`,
      descricao: `Foram ${formatarDuracaoMinutos(dia.totalMinutosTrabalhados)} trabalhadas. O limite é de 10h por dia: 8h de jornada mais até 2h extras (CLT arts. 58 e 59).`,
    });
  }
  return alertas;
}
