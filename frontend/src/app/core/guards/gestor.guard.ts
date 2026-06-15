import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UsuarioSessaoService } from '../services/usuario-sessao.service';

export const gestorGuard: CanActivateFn = () => {
  const sessao = inject(UsuarioSessaoService);
  if (sessao.eGestor()) return true;
  return inject(Router).createUrlTree(['/']);
};
