import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class DemandaUsuarioAtribuidoDto {
    demandaId: number;
    usuarioId: number;
    nomeUsuario: string;
    /** Cor da bolinha escolhida pela pessoa (`#RRGGBB`); `null` = cor padrão do tema. */
    corAvatar: string | null;
    login: string;
    tipo: TipoUsuarioEnum;
}
