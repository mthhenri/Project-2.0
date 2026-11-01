import { Routes } from '@angular/router';
import { podeGerenciarTag } from '@project20/shared';
import { permissaoGuard } from '../../core/guards/permissao.guard';

export const tagRotas: Routes = [
    {
        path: '',
        canActivate: [permissaoGuard(podeGerenciarTag)],
        loadComponent: () =>
            import('./pages/tag-listagem/tag-listagem.page').then(
                (m) => m.TagListagemPage,
            ),
    },
];
