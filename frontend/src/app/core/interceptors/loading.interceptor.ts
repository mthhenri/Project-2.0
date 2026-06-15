import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { carregamento } from '../signals/carregamento.signal';

export const loadingInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  carregamento.set(true);

  return proximo(requisicao).pipe(
    finalize(() => carregamento.set(false)),
  );
};
