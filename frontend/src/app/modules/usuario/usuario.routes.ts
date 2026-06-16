import { Routes } from '@angular/router';
import { gestorGuard } from '../../core/guards/gestor.guard';

export const usuarioRotas: Routes = [
  {
    path: '',
    canActivate: [gestorGuard],
    loadComponent: () =>
      import('./pages/usuario-listagem/usuario-listagem.page').then(
        (m) => m.UsuarioListagemPage,
      ),
  },
  {
    path: 'novo',
    canActivate: [gestorGuard],
    loadComponent: () =>
      import('./pages/usuario-formulario/usuario-formulario.page').then(
        (m) => m.UsuarioFormularioPage,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/usuario-perfil/usuario-perfil.page').then(
        (m) => m.UsuarioPerfilPage,
      ),
  },
  {
    path: ':id/anotacoes',
    loadComponent: () =>
      import('./pages/usuario-anotacoes/usuario-anotacoes.page').then(
        (m) => m.UsuarioAnotacoesPage,
      ),
  },
];
