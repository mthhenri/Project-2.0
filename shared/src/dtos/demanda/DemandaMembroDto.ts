import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class DemandaMembroDto {
    usuarioId: number;
    nomeCompleto: string;
    /** Cor da bolinha escolhida pela pessoa (`#RRGGBB`); `null` = cor padrão do tema. */
    corAvatar: string | null;
    login: string;
    tipo: TipoUsuarioEnum;
    cargoTitulo: string;
}
