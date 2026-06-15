import { Routes } from '@angular/router';
import { autenticacaoGuard, somentePublicoGuard } from './core/guards/autenticacao.guard';
import { LayoutComponent } from './shared/layout/layout.component';

export const rotas: Routes = [
  {
    path: 'autenticacao',
    canActivate: [somentePublicoGuard],
    loadComponent: () =>
      import('./modules/autenticacao/pages/login/login.page').then(
        (modulo) => modulo.LoginPage,
      ),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [autenticacaoGuard],
    children: [
      { path: 'usuario',    loadChildren: () => import('./modules/usuario/usuario.routes').then((m) => m.usuarioRotas) },
      { path: 'projeto',    loadChildren: () => import('./modules/projeto/projeto.routes').then((m) => m.projetoRotas) },
      { path: 'demanda',    loadChildren: () => import('./modules/demanda/demanda.routes').then((m) => m.demandaRotas) },
      { path: 'atividade',  loadChildren: () => import('./modules/atividade/atividade.routes').then((m) => m.atividadeRotas) },
      { path: 'execucao',   loadChildren: () => import('./modules/execucao/execucao.routes').then((m) => m.execucaoRotas) },
      { path: 'ponto',      loadChildren: () => import('./modules/ponto/ponto.routes').then((m) => m.pontoRotas) },
      { path: 'calendario', loadChildren: () => import('./modules/calendario/calendario.routes').then((m) => m.calendarioRotas) },
      { path: 'tag',        loadChildren: () => import('./modules/tag/tag.routes').then((m) => m.tagRotas) },
      { path: '', redirectTo: 'ponto', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'autenticacao' },
];
