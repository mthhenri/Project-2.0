import { Routes } from '@angular/router';
import { gestorGuard } from '../../core/guards/gestor.guard';

export const calendarioRotas: Routes = [
    {
        path: '',
        canActivate: [gestorGuard],
        loadComponent: () =>
            import('./pages/calendario-listagem/calendario-listagem.page').then(
                (m) => m.CalendarioListagemPage,
            ),
    },
];
