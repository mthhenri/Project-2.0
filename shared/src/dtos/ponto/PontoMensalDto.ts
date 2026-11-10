import { PontoDiaResumoDto } from './PontoDiaResumoDto';

export class PontoMensalDto {
    usuarioId: number;
    nomeUsuario: string;
    /** Cor da bolinha escolhida pela pessoa (`#RRGGBB`); `null` = cor padrão do tema. */
    corAvatar: string | null;
    ano: number;
    mes: number;
    diasUteisMes: number;
    metaMinutosMes: number;
    totalMinutosTrabalhadosMes: number;
    saldoMinutosMes: number;
    dias: PontoDiaResumoDto[];
}
