import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const token = localStorage.getItem('access_token');

  if (!token || requisicao.url.includes('/autenticacao/login')) {
    return proximo(requisicao);
  }

  const requisicaoComToken = requisicao.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return proximo(requisicaoComToken);
};
