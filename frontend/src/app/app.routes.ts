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
      { path: 'chat',       loadChildren: () => import('./modules/chat/chat.routes').then((m) => m.chatRotas) },
      { path: 'configuracao-ia', loadChildren: () => import('./modules/configuracao-ia/configuracao-ia.routes').then((m) => m.configuracaoIaRotas) },
      { path: 'modelagem', loadChildren: () => import('./modules/modelagem/modelagem.routes').then((m) => m.modelagemRotas) },
      { path: '', redirectTo: 'ponto', pathMatch: 'full' },
    ],
  },
  // A janela do check-in (que o app Electron traz à frente) tem layout próprio: sem menu lateral nem barra superior.
  {
    path: 'checkin',
    canActivate: [autenticacaoGuard],
    loadChildren: () => import('./modules/checkin/checkin.routes').then((m) => m.checkinRotas),
  },
  // A janela de chat do Project Desktop (task 213): também sem menu lateral nem barra superior.
  {
    path: 'chat-popup',
    canActivate: [autenticacaoGuard],
    loadComponent: () => import('./modules/mensagem-direta/pages/chat-popup/chat-popup.page').then((m) => m.ChatPopupPage),
  },
  { path: '**', redirectTo: 'autenticacao' },
];
