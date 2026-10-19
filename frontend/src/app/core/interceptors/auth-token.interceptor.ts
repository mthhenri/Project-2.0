import { HttpInterceptorFn } from '@angular/common/http';
import { ambiente } from '../../../environments/environment';

export const authTokenInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const token = localStorage.getItem('access_token');

  // O token só vai para a nossa API (relativa no desenvolvimento, absoluta em produção) e nunca no login.
  if (!token || !requisicao.url.startsWith(ambiente.apiUrl) || requisicao.url.includes('/autenticacao/login')) {
    return proximo(requisicao);
  }

  const requisicaoComToken = requisicao.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return proximo(requisicaoComToken);
};
