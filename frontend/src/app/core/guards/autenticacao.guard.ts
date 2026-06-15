import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const autenticacaoGuard: CanActivateFn = () => {
  const roteador = inject(Router);
  const token = localStorage.getItem('token');

  if (token) {
    return true;
  }

  return roteador.createUrlTree(['/autenticacao']);
};
