import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';
import { carregamentoAtivo } from '../signals/carregamento.signal';

export const loadingInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  carregamentoAtivo.set(true);

  return proximo(requisicao).pipe(
    finalize(() => carregamentoAtivo.set(false)),
  );
};
