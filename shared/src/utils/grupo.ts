import { TipoGrupoEnum } from '../enums/tipo-grupo.enum';
import { TipoUsuarioEnum } from '../enums/tipo-usuario.enum';
import { temPermissaoDeGestor } from './permissao-usuario';

/** Quantas pessoas cabem num grupo livre (protege o aviso em tempo real, que leva a lista de quem recebe). */
export const LIMITE_MEMBROS_DO_GRUPO = 50;
export const LIMITE_NOME_DO_GRUPO = 60;
/** Um emoji pode ser uma sequência de vários pontos de código (família, bandeira, tom de pele). */
export const LIMITE_EMOJI_DO_GRUPO = 32;

/** O grupo é um canal de demanda ou de projeto (task 248): membros e nome vêm do alvo, não são editados no grupo e a supervisão o lê sempre. */
export function grupoEhCanal(tipo: TipoGrupoEnum): boolean {
    return tipo === TipoGrupoEnum.DEMANDA || tipo === TipoGrupoEnum.PROJETO;
}

/** O grupo é privado para a supervisão quando algum membro atual tem poder de gestor (gestor ou administrador). */
export function grupoEhPrivado(tiposDosMembros: TipoUsuarioEnum[], tipo: TipoGrupoEnum = TipoGrupoEnum.LIVRE): boolean {
    if (grupoEhCanal(tipo)) return false;
    return tiposDosMembros.some((tipoDoMembro) => temPermissaoDeGestor(tipoDoMembro));
}
