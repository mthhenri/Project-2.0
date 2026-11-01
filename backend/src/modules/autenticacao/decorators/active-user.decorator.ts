import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../domain/interfaces/jwt-payload.interface';

export const ActiveUser = createParamDecorator(
    (_data: unknown, executionContext: ExecutionContext): JwtPayload => {
        return executionContext.switchToHttp().getRequest().user;
    },
);
