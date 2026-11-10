import { ExecucaoItemDto } from '../execucao/ExecucaoItemDto';
import { IntervaloDto } from './IntervaloDto';

export class PontoDiarioDto {
    data: string;
    usuarioId: number;
    nomeUsuario: string;
    /** Cor da bolinha escolhida pela pessoa (`#RRGGBB`); `null` = cor padrão do tema. */
    corAvatar: string | null;
    ehDiaUtil: boolean;
    motivoNaoUtil: string | null;
    metaMinutos: number;
    minutosTrabalhadosDiaUtil: number;
    minutosTrabalhadosExtra: number;
    totalMinutosTrabalhados: number;
    saldoMinutos: number;
    intervalos: IntervaloDto[];
    execucoes: ExecucaoItemDto[];
}
