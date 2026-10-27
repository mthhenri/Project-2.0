import { Routes } from '@angular/router';

export const documentacaoRotas: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/documentacao/documentacao.page').then((modulo) => modulo.DocumentacaoPage),
  },
];
