import { Routes } from '@angular/router';
import { CanDeactivateFn } from '@angular/router';
import { administradorGuard } from '../../core/guards/administrador.guard';

const sairSemPerderRascunho: CanDeactivateFn<{ podeSair(): Promise<boolean> }> = (pagina) => pagina.podeSair();

export const configuracaoIaRotas: Routes = [
  {
    path: '',
    canActivate: [administradorGuard],
    canDeactivate: [sairSemPerderRascunho],
    loadComponent: () =>
      import('./pages/configuracao-ia/configuracao-ia.page').then((m) => m.ConfiguracaoIaPage),
  },
];
