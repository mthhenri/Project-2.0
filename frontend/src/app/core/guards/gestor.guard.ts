import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { UsuarioTipoEnum } from '@project20/shared';
import { usuarioAutenticado } from '../signals/usuario-autenticado.signal';

export const gestorGuard: CanActivateFn = () => {
  const usuario = usuarioAutenticado();

  if (usuario?.tipo === UsuarioTipoEnum.GESTOR) return true;

  return inject(Router).createUrlTree(['/']);
};
