import { GrupoResumoDto } from './GrupoResumoDto';

/** O grupo depois de adicionar pessoas; quem já era membro é ignorado. */
export interface GrupoMembroAdicionadoDto {
    grupo: GrupoResumoDto;
    /** Quem entrou de fato nesta chamada. */
    adicionadosUsuarioIds: number[];
}
