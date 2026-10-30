import { Routes } from '@angular/router';
import { gestorGuard } from '../../core/guards/gestor.guard';

export const relatorioRotas: Routes = [
  {
    path: '',
    canActivate: [gestorGuard],
    loadComponent: () =>
      import('./pages/relatorio-execucao/relatorio-execucao.page').then((m) => m.RelatorioExecucaoPage),
  },
];
