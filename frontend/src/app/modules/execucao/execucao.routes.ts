import { Routes } from '@angular/router';

export const execucaoRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/execucao-historico/execucao-historico.page').then(
        (modulo) => modulo.ExecucaoHistoricoPage,
      ),
  },
  {
    path: 'ativa',
    loadComponent: () =>
      import('./pages/execucao-ativa/execucao-ativa.page').then(
        (modulo) => modulo.ExecucaoAtivaPage,
      ),
  },
];
