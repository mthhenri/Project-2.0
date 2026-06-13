import { UsuarioTipoEnum } from '@project20/shared';

export interface JwtPayload {
  sub: number;
  login: string;
  tipo: UsuarioTipoEnum;
}
