import { Routes } from '@angular/router';

export const calendarioRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/calendario-listagem/calendario-listagem.page').then(
        (m) => m.CalendarioListagemPage,
      ),
  },
];
