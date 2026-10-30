import { Routes } from '@angular/router';
import { gestorGuard } from '../../core/guards/gestor.guard';

export const projetoRotas: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/projeto-listagem/projeto-listagem.page').then(
        (m) => m.ProjetoListagemPage,
      ),
  },
  {
    path: ':id/relatorio',
    canActivate: [gestorGuard],
    loadComponent: () =>
      import('../relatorio/pages/relatorio-execucao/relatorio-execucao.page').then(
        (m) => m.RelatorioExecucaoPage,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/projeto-detalhe/projeto-detalhe.page').then(
        (m) => m.ProjetoDetalhePage,
      ),
  },
];
