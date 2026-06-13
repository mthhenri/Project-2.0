import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';

export const ActiveUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user;
  },
);
