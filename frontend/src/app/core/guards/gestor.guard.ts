import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { usuarioAutenticado } from '../signals/usuario-autenticado.signal';

export const gestorGuard: CanActivateFn = () => {
  const roteador = inject(Router);
  const usuario = usuarioAutenticado();

  if (usuario?.tipo === 'GESTOR') {
    return true;
  }

  return roteador.createUrlTree(['/']);
};
