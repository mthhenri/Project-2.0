import { Routes } from '@angular/router';

export const pontoRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/ponto/ponto.page').then((modulo) => modulo.PontoPage),
  },
];
