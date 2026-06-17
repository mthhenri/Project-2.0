import { Routes } from '@angular/router';

export const demandaRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/demanda-projeto/demanda-projeto.page').then(
        (modulo) => modulo.DemandaProjetoPage,
      ),
  },
];
