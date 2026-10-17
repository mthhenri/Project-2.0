import { Routes } from '@angular/router';
import { administradorGuard } from '../../core/guards/administrador.guard';

export const configuracaoIaRotas: Routes = [
  {
    path: '',
    canActivate: [administradorGuard],
    loadComponent: () =>
      import('./pages/configuracao-ia/configuracao-ia.page').then((m) => m.ConfiguracaoIaPage),
  },
];
