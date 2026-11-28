import { TipoUsuarioEnum } from '@project20/shared';

export interface JwtPayload {
    sub: number;
    login: string;
    tipo: TipoUsuarioEnum;
    /** Vencimento do token, em segundos desde 1970 (claim padrão do JWT, gravada na assinatura). */
    exp?: number;
}
