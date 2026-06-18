export class PontoDiaResumoDto {
  data: string;
  ehDiaUtil: boolean;
  motivoNaoUtil: string | null;
  primeiroInicioData: Date | null;
  ultimoFimData: Date | null;
  totalMinutosTrabalhados: number;
  saldoMinutos: number;
}
