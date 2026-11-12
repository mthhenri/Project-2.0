import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

/** Um membro atual do grupo. */
export interface GrupoMembroResumoDto {
    usuarioId: number;
    usuarioNome: string;
    tipo: TipoUsuarioEnum;
    /** Cor da bolinha da pessoa; `null` = cor padrão. Com ela se monta o degradê do grupo sem cor. */
    corAvatar: string | null;
    entradaData: Date;
    online: boolean;
}
