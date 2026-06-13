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
  intercept(contexto: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((dados) => {
        if (
          dados !== null &&
          typeof dados === 'object' &&
          'sucesso' in dados
        ) {
          return dados;
        }
        return {
          sucesso:  true,
          dados,
          mensagem: 'Operação realizada com sucesso',
        };
      }),
    );
  }
}
