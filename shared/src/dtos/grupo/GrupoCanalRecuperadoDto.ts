import { GrupoResumoDto } from './GrupoResumoDto';

/** O canal de uma demanda ou de um projeto; `grupo` é `null` quando ainda não foi criado (a tela oferece "Criar chat"). */
export interface GrupoCanalRecuperadoDto {
    grupo: GrupoResumoDto | null;
}
