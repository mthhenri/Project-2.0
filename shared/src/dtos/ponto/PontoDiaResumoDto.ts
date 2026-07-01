import { IntervaloDto } from './IntervaloDto';

export class PontoDiaResumoDto {
  data: string;
  ehDiaUtil: boolean;
  motivoNaoUtil: string | null;
  primeiroInicioData: Date | null;
  ultimoFimData: Date | null;
  totalMinutosTrabalhados: number;
  saldoMinutos: number;
  /** Meta **efetiva** do dia (já descontada a justificativa), em minutos. */
  metaMinutos: number;
  /** Intervalos do dia (gaps entre execuções), para a impressão do espelho de ponto. */
  intervalos: IntervaloDto[];
  /** Título da justificativa do dia, quando houver. */
  justificativaNome: string | null;
  /** Minutos descontados pela justificativa naquele dia (`null` se não houver). */
  justificativaMinutosCobertos: number | null;
}
