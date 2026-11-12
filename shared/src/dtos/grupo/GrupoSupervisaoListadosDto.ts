import { GrupoSupervisaoResumoDto } from './GrupoSupervisaoResumoDto';

/** Uma página dos grupos supervisionáveis, do que teve mensagem mais recente. */
export interface GrupoSupervisaoListadosDto {
    grupos: GrupoSupervisaoResumoDto[];
    /** Quantos grupos casam, em todas as páginas. */
    total: number;
    pagina: number;
    porPagina: number;
}
