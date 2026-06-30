import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TipoUsuarioEnum } from '@project20/shared';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

@Injectable()
export class GestorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const gestorOnly = this.reflector.getAllAndOverride<boolean>('gestorOnly', [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!gestorOnly) return true;

    const usuarioAtivo: JwtPayload = contexto.switchToHttp().getRequest().user;
    if (usuarioAtivo?.tipo !== TipoUsuarioEnum.GESTOR) {
      throw new UnauthorizedAccessException('Acesso restrito a gestores');
    }
    return true;
  }
}
