import { Routes } from '@angular/router';

export const execucaoRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/execucao-historico/execucao-historico.page').then(
        (modulo) => modulo.ExecucaoHistoricoPage,
      ),
  },
];
