import { ExecucaoResumoDto } from '../execucao/ExecucaoResumoDto';
import { IntervaloDto } from './IntervaloDto';

export class PontoDiarioDto {
  data: string;
  usuarioId: number;
  nomeUsuario: string;
  ehDiaUtil: boolean;
  motivoNaoUtil: string | null;
  metaMinutos: number;
  minutosTrabalhadosDiaUtil: number;
  minutosTrabalhadosExtra: number;
  totalMinutosTrabalhados: number;
  saldoMinutos: number;
  intervalos: IntervaloDto[];
  execucoes: ExecucaoResumoDto[];
}
