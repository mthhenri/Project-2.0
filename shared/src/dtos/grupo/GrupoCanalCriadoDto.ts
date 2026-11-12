import { GrupoResumoDto } from './GrupoResumoDto';

/** O canal aberto; `jaExistia` é verdadeiro quando o pedido só devolveu o canal que outra pessoa tinha criado. */
export interface GrupoCanalCriadoDto {
    grupo: GrupoResumoDto;
    jaExistia: boolean;
}
