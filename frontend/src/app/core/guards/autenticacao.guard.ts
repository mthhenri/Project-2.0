import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { parametrosRetorno } from '../interceptors/error-handler.interceptor';

export const autenticacaoGuard: CanActivateFn = (_rota, estado) => {
  const token = localStorage.getItem('access_token');

  if (token) return true;

  return inject(Router).createUrlTree(['/autenticacao'], { queryParams: parametrosRetorno(estado.url) });
};

export const somentePublicoGuard: CanActivateFn = () => {
  const token = localStorage.getItem('access_token');

  if (!token) return true;

  return inject(Router).createUrlTree(['/']);
};
