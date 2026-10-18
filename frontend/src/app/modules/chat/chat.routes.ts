import { Routes } from '@angular/router';

export const chatRotas: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/chat/chat.page').then((m) => m.ChatPage),
  },
];
