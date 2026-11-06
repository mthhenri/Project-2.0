import { BaseEntity } from '../../../../core/base/base.entity';
import { TipoUsuarioEnum } from '@project20/shared';

export class Usuario extends BaseEntity {
    login: string;
    senhaEncriptada: string;
    nomeCompleto: string;
    cargoTitulo: string;
    horasDiariasNecessarias: number;
    tipo: TipoUsuarioEnum;
    ativo: boolean;
    corAvatar: string | null;
}
