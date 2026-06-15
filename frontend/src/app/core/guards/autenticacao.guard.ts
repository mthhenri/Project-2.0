import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export const autenticacaoGuard: CanActivateFn = () => {
  const token = localStorage.getItem('access_token');

  if (token) return true;

  return inject(Router).createUrlTree(['/autenticacao']);
};
