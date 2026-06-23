import { Component, DestroyRef, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AutenticacaoService } from '../../../core/services/autenticacao.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { TemaService } from '../../../core/services/tema.service';
import { UsuarioAnotacoesDialogComponent } from '../../../modules/usuario/components/usuario-anotacoes-dialog/usuario-anotacoes-dialog.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [RouterModule, ButtonModule, PopoverModule, TooltipModule, DividerModule, UsuarioAnotacoesDialogComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly autenticacaoService = inject(AutenticacaoService);
  readonly sessao = inject(UsuarioSessaoService);
  readonly tema = inject(TemaService);
  private readonly destroyRef = inject(DestroyRef);
  readonly horaAtual = signal<string>('');

  private readonly todosItensNavegacao = [
    { label: 'Ponto',      icone: 'pi pi-clock',        rotaLink: '/ponto',      somenteGestor: false },
    { label: 'Calendário', icone: 'pi pi-calendar',     rotaLink: '/calendario', somenteGestor: true  },
    { label: 'Projetos',   icone: 'pi pi-folder',       rotaLink: '/projeto',    somenteGestor: true  },
    { label: 'Demandas',   icone: 'pi pi-sitemap',      rotaLink: '/demanda',    somenteGestor: false },
    { label: 'Atividades', icone: 'pi pi-check-square', rotaLink: '/atividade',  somenteGestor: false },
    { label: 'Execuções',  icone: 'pi pi-play',         rotaLink: '/execucao',   somenteGestor: false },
    { label: 'Tags',       icone: 'pi pi-tag',          rotaLink: '/tag',        somenteGestor: true  },
    { label: 'Usuários',   icone: 'pi pi-users',        rotaLink: '/usuario',    somenteGestor: true  },
  ];

  readonly itensNavegacao = computed(() =>
    this.todosItensNavegacao.filter((item) => !item.somenteGestor || this.sessao.eGestor()),
  );

  constructor() {
    this.atualizarHora();
    this.agendarProximaAtualizacao();
  }

  private agendarProximaAtualizacao(): void {
    const agora = new Date();
    const msAteProximoMinuto = (60 - agora.getSeconds()) * 1000 - agora.getMilliseconds();
    timer(msAteProximoMinuto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.atualizarHora();
        this.agendarProximaAtualizacao();
      });
  }

  private atualizarHora(): void {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const data = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    this.horaAtual.set(`${hora} ${data}`);
  }

  sair(): void {
    this.autenticacaoService.logout();
  }
}
