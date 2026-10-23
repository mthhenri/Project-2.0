import { Routes } from '@angular/router';

/** Qualquer usuário autenticado vê a modelagem (a rota herda só o `autenticacaoGuard` do layout). */
export const modelagemRotas: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/modelagem/modelagem.page').then((m) => m.ModelagemPage),
  },
];
