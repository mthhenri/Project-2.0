import { Routes } from '@angular/router';

export const checkinRotas: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/checkin/checkin.page').then((m) => m.CheckinPage),
  },
];
