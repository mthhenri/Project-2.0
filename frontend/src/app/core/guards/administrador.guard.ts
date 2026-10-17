import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UsuarioSessaoService } from '../services/usuario-sessao.service';

/** Rota exclusiva de administrador (o gestor é redirecionado como quem não tem acesso). */
export const administradorGuard: CanActivateFn = () => {
  const sessao = inject(UsuarioSessaoService);
  if (sessao.eAdministrador()) return true;
  return inject(Router).createUrlTree(['/']);
};
