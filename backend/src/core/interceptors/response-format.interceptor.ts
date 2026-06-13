import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseFormatInterceptor implements NestInterceptor {
  intercept(_contexto: ExecutionContext, proximoHandler: CallHandler): Observable<unknown> {
    return proximoHandler.handle().pipe(
      map((dados) => ({
        sucesso:  true,
        dados:    dados ?? null,
        mensagem: 'Operação realizada com sucesso',
      })),
    );
  }
}
