import { Routes } from '@angular/router';
import { gestorGuard } from '../../core/guards/gestor.guard';

export const projetoRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/projeto-listagem/projeto-listagem.page').then(
        (m) => m.ProjetoListagemPage,
      ),
  },
  {
    path: 'novo',
    canActivate: [gestorGuard],
    loadComponent: () =>
      import('./pages/projeto-formulario/projeto-formulario.page').then(
        (m) => m.ProjetoFormularioPage,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/projeto-detalhe/projeto-detalhe.page').then(
        (m) => m.ProjetoDetalhePage,
      ),
  },
];
