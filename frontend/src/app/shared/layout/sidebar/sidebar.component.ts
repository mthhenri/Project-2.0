import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MenuModule],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly itensNavegacao = [
    { label: 'Ponto',      icon: 'pi pi-clock',        routerLink: '/ponto' },
    { label: 'Execuções',  icon: 'pi pi-play',         routerLink: '/execucao' },
    { label: 'Atividades', icon: 'pi pi-check-square', routerLink: '/atividade' },
    { label: 'Demandas',   icon: 'pi pi-sitemap',      routerLink: '/demanda' },
    { label: 'Projetos',   icon: 'pi pi-folder',       routerLink: '/projeto' },
    { label: 'Tags',       icon: 'pi pi-tag',          routerLink: '/tag' },
    { label: 'Usuários',   icon: 'pi pi-users',        routerLink: '/usuario' },
    { label: 'Calendário', icon: 'pi pi-calendar',     routerLink: '/calendario' },
  ];
}
