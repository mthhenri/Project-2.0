import { Component, DestroyRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { EstadoIaEnum } from '@project20/shared';
import { IaDisponibilidadeService } from '../../../core/services/ia-disponibilidade.service';
import { UsuarioSessaoService } from '../../../core/services/usuario-sessao.service';
import { focoEmCampo, haSobreposicaoAberta } from '../../../core/utils/atalhos';
import { ITENS_NAVEGACAO, ItemNavegacao } from '../navegacao';

const CHAVE_RECOLHIDA = 'sidebar.recolhida';
/** Abaixo desta largura a barra entra recolhida, para sobrar espaço ao conteúdo. */
const LARGURA_MINIMA_EXPANDIDA = 1280;
/** De quanto em quanto tempo a barra confere se a IA continua no ar (para liberar as telas convencionais se ela cair). */
const INTERVALO_DISPONIBILIDADE_MS = 60_000;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, TooltipModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly roteador = inject(Router);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly recolhida = signal<boolean>(this.lerEstadoInicial());

  /** Itens visíveis ao usuário, cada um com a marca de desabilitado (tela substituída pelo chat enquanto a IA está no ar). */
  readonly itensNavegacao = computed(() =>
    ITENS_NAVEGACAO.filter(
      (item) =>
        (!item.somenteGestor || this.sessao.eGestor()) &&
        (!item.somenteAdministrador || this.sessao.eAdministrador()),
    ).map((item) => {
      const semIa = !!item.iconeSemIa && this.iaDisponibilidade.estadoReal() !== null && this.iaDisponibilidade.estadoReal() !== EstadoIaEnum.NO_AR;
      return { ...item, icone: semIa ? item.iconeSemIa! : item.icone, semIa, desabilitado: this.estaDesabilitado(item) };
    }),
  );

  ngOnInit(): void {
    this.iaDisponibilidade.carregar();
    const temporizador = setInterval(() => this.iaDisponibilidade.carregar(), INTERVALO_DISPONIBILIDADE_MS);
    this.destroyRef.onDestroy(() => clearInterval(temporizador));
  }

  private estaDesabilitado(item: ItemNavegacao): boolean {
    if (!item.substituidoPelaIa || this.iaDisponibilidade.estado() !== EstadoIaEnum.NO_AR) return false;
    return item.substituidoPelaIa === 'TODOS' || !this.sessao.eGestor();
  }

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
      const destino = this.itensNavegacao().find((item) => item.tecla === tecla && !item.desabilitado);
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
