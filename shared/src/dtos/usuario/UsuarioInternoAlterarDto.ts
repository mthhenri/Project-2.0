import { TipoUsuarioEnum } from '../../enums/tipo-usuario.enum';

export class UsuarioInternoAlterarDto {
    id: number;
    login?: string;
    nomeCompleto?: string;
    cargoTitulo?: string;
    horasDiariasNecessarias?: number;
    ativo?: boolean;
    tipo?: TipoUsuarioEnum;
    corAvatar?: string | null;
}
