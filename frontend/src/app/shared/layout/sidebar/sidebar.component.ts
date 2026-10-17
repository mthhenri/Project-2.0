import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { focoEmCampo, haSobreposicaoAberta } from '../../../core/utils/atalhos';
import { ITENS_NAVEGACAO } from '../navegacao';

const CHAVE_RECOLHIDA = 'sidebar.recolhida';
/** Abaixo desta largura a barra entra recolhida, para sobrar espaço ao conteúdo. */
const LARGURA_MINIMA_EXPANDIDA = 1280;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, TooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly roteador = inject(Router);

  readonly recolhida = signal<boolean>(this.lerEstadoInicial());

  readonly itensNavegacao = computed(() =>
    ITENS_NAVEGACAO.filter((item) => !item.somenteGestor || this.sessao.eGestor()),
  );

  alternar(): void {
    const proximo = !this.recolhida();
    this.recolhida.set(proximo);
    try {
      localStorage.setItem(CHAVE_RECOLHIDA, String(proximo));
    } catch {
      // Sem armazenamento (janela privada, dados bloqueados): a barra funciona, só não lembra.
    }
  }

  private lerEstadoInicial(): boolean {
    try {
      const salvo = localStorage.getItem(CHAVE_RECOLHIDA);
      if (salvo !== null) return salvo === 'true';
    } catch {
      // cai no padrão por largura
    }
    return window.innerWidth < LARGURA_MINIMA_EXPANDIDA;
  }

  // --- Atalho de navegação: `g` seguido da letra do item (task 96) ---
  private aguardandoSegundaTecla = false;
  private temporizadorAtalho: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:keydown', ['$event'])
  aoTeclarGlobal(evento: KeyboardEvent): void {
    if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) {
      this.cancelarSequencia();
      return;
    }

    const tecla = evento.key.toLowerCase();
    if (this.aguardandoSegundaTecla) {
      this.cancelarSequencia();
      const destino = this.itensNavegacao().find((item) => item.tecla === tecla);
      if (destino) {
        evento.preventDefault();
        this.roteador.navigateByUrl(destino.rotaLink);
      }
      return;
    }

    if (tecla === 'g') {
      this.aguardandoSegundaTecla = true;
      this.temporizadorAtalho = setTimeout(() => this.cancelarSequencia(), 1500);
    }
  }

  private cancelarSequencia(): void {
    this.aguardandoSegundaTecla = false;
    if (this.temporizadorAtalho !== null) clearTimeout(this.temporizadorAtalho);
    this.temporizadorAtalho = null;
  }
}
