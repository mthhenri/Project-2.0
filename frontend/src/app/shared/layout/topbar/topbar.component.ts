import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AutenticacaoService } from '../../../core/services/autenticacao.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, ButtonModule, PopoverModule, TooltipModule, DividerModule],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly autenticacaoService = inject(AutenticacaoService);
  readonly sessao = inject(UsuarioSessaoService);
  readonly horaAtual = signal<string>('');

  readonly itensNavegacao = [
    { label: 'Ponto',      icone: 'pi pi-clock',        rotaLink: '/ponto' },
    { label: 'Calendário', icone: 'pi pi-calendar',     rotaLink: '/calendario' },
    { label: 'Projetos',   icone: 'pi pi-folder',       rotaLink: '/projeto' },
    { label: 'Demandas',   icone: 'pi pi-sitemap',      rotaLink: '/demanda' },
    { label: 'Atividades', icone: 'pi pi-check-square', rotaLink: '/atividade' },
    { label: 'Execuções',  icone: 'pi pi-play',         rotaLink: '/execucao' },
    { label: 'Tags',       icone: 'pi pi-tag',          rotaLink: '/tag' },
    { label: 'Usuários',   icone: 'pi pi-users',        rotaLink: '/usuario' },
  ];

  constructor() {
    this.atualizarHora();
    interval(60000).pipe(takeUntilDestroyed()).subscribe(() => this.atualizarHora());
  }

  private atualizarHora(): void {
    const agora = new Date();
    this.horaAtual.set(agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  }

  sair(): void {
    this.autenticacaoService.logout();
  }
}
