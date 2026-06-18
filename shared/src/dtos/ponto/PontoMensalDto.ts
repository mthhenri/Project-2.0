import { PontoDiaResumoDto } from './PontoDiaResumoDto';

export class PontoMensalDto {
  usuarioId: number;
  nomeUsuario: string;
  ano: number;
  mes: number;
  diasUteisMes: number;
  metaMinutosMes: number;
  totalMinutosTrabalhadosMes: number;
  saldoMinutosMes: number;
  dias: PontoDiaResumoDto[];
}
