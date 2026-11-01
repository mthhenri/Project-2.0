import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TipoUsuarioEnum } from '@project20/shared';
import { UsuarioSessaoService } from '../services/usuario-sessao.service';

/** Guard da rota por permissão de ação (`@project20/shared`): quem não tem volta para a raiz, como no `gestorGuard`. */
export function permissaoGuard(permissao: (tipo: TipoUsuarioEnum) => boolean): CanActivateFn {
    return () => {
        const usuario = inject(UsuarioSessaoService).usuarioAtual();
        if (usuario && permissao(usuario.tipo)) return true;
        return inject(Router).createUrlTree(['/']);
    };
}
