import { TipoGrupoEnum } from '../../enums/tipo-grupo.enum';

/** O canal de uma demanda (`tipo` DEMANDA, `alvoId` = id da demanda) ou de um projeto (`tipo` PROJETO, `alvoId` = id do projeto). Montado pela controller a partir da rota. */
export interface GrupoCanalRecuperarDto {
    tipo: TipoGrupoEnum.DEMANDA | TipoGrupoEnum.PROJETO;
    alvoId: number;
}
