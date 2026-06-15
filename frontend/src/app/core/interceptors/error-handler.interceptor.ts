import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorHandlerInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  return proximo(requisicao).pipe(
    catchError((erro) => {
      return throwError(() => erro);
    }),
  );
};
