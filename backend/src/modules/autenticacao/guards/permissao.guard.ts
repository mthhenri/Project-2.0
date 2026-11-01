import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';
import { CHAVE_PERMISSAO_EXIGIDA, PermissaoDeAcao } from '../decorators/exige-permissao.decorator';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';

@Injectable()
export class PermissaoGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(contexto: ExecutionContext): boolean {
        const permissao = this.reflector.getAllAndOverride<PermissaoDeAcao | undefined>(CHAVE_PERMISSAO_EXIGIDA, [
            contexto.getHandler(),
            contexto.getClass(),
        ]);
        if (!permissao) return true;

        const usuarioAtivo: JwtPayload = contexto.switchToHttp().getRequest().user;
        if (!usuarioAtivo || !permissao(usuarioAtivo.tipo)) {
            throw new UnauthorizedAccessException('Você não tem permissão para esta ação');
        }
        return true;
    }
}
