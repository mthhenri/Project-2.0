import { Routes } from '@angular/router';

export const atividadeRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/atividade-listagem/atividade-listagem.page').then(
        (modulo) => modulo.AtividadeListagemPage,
      ),
  },
  {
    // Antes de ':id': "nova" não é um id.
    path: 'nova',
    loadComponent: () =>
      import('./pages/atividade-nova/atividade-nova.page').then(
        (modulo) => modulo.AtividadeNovaPage,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/atividade-detalhe/atividade-detalhe.page').then(
        (modulo) => modulo.AtividadeDetalhePage,
      ),
  },
];
