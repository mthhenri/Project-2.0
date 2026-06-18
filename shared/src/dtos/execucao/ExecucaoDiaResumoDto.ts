export class ExecucaoDiaResumoDto {
  dia: string;
  primeiroInicioData: Date;
  ultimoFimData: Date | null;
  totalMinutosTrabalhados: number;
}
