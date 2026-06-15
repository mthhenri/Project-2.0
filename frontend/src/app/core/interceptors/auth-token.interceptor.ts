import { HttpInterceptorFn } from '@angular/common/http';

export const authTokenInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const token = localStorage.getItem('token');

  if (token) {
    const requisicaoAutenticada = requisicao.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
    return proximo(requisicaoAutenticada);
  }

  return proximo(requisicao);
};
