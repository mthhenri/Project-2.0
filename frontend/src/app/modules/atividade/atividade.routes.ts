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
    path: 'nova',
    loadComponent: () =>
      import('./pages/atividade-formulario/atividade-formulario.page').then(
        (modulo) => modulo.AtividadeFormularioPage,
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
