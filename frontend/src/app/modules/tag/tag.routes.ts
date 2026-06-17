import { Routes } from '@angular/router';
import { gestorGuard } from '../../core/guards/gestor.guard';

export const tagRotas: Routes = [
  {
    path: '',
    canActivate: [gestorGuard],
    loadComponent: () =>
      import('./pages/tag-listagem/tag-listagem.page').then(
        (m) => m.TagListagemPage,
      ),
  },
];
