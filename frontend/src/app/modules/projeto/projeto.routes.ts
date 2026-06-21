import { Routes } from '@angular/router';

export const projetoRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/projeto-listagem/projeto-listagem.page').then(
        (m) => m.ProjetoListagemPage,
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
