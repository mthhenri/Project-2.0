import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(contexto: ExecutionContext) {
    const isPublica = this.reflector.getAllAndOverride<boolean>('isPublic', [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (isPublica) return true;
    return super.canActivate(contexto);
  }
}
