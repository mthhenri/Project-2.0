import { TipoGrupoEnum } from '../../enums/tipo-grupo.enum';

/** Abre o canal de uma demanda ou de um projeto; se já existe, devolve o existente (idempotente). Montado pela controller a partir da rota. */
export interface GrupoCanalCriarDto {
    tipo: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO;
    alvoId: number;
}
