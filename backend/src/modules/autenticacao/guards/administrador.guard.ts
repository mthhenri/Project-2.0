import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { temPermissaoDeAdministrador } from '@project20/shared';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

@Injectable()
export class AdministradorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const administradorOnly = this.reflector.getAllAndOverride<boolean>('administradorOnly', [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!administradorOnly) return true;

    const usuarioAtivo: JwtPayload = contexto.switchToHttp().getRequest().user;
    if (!usuarioAtivo || !temPermissaoDeAdministrador(usuarioAtivo.tipo)) {
      throw new UnauthorizedAccessException('Acesso restrito a administradores');
    }
    return true;
  }
}
