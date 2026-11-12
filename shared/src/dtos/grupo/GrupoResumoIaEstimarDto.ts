import { IsBoolean, IsDateString } from 'class-validator';

/**
 * Pede a estimativa de um resumo do grupo ou canal: o período (instantes ISO) e se os blocos de código vão ao provedor de IA. Nada é chamado nem
 * gravado. Os resumos seguem o mesmo corpo (`GrupoResumoIaCriarDto`).
 */
export class GrupoResumoIaEstimarDto {
    /** Vem da rota e é preenchido pela controller; nunca pelo corpo. */
    grupoId: number;

    @IsDateString()
    inicioData: string;

    @IsDateString()
    fimData: string;

    @IsBoolean()
    enviaCodigo: boolean;
}
