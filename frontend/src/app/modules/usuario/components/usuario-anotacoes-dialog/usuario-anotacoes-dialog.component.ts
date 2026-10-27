import { Component, DestroyRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AnotacoesAlteradasEvento, PadService } from '../../services/pad.service';
import { LARGURA_DO_PAD, larguraDoPadPeloPonteiro, larguraMaximaDoPad, limitarLarguraDoPad } from '../../utils/pad-largura.util';
import { PadPainelComponent } from '../pad-painel/pad-painel.component';

export type { AnotacoesAlteradasEvento };

/**
 * O pad do usuário num drawer lateral (tasks 114, 126 e 256): o conteúdo é o `app-pad-painel`, e o drawer cuida só do contêiner. A largura se
 * ajusta arrastando a borda esquerda (ou pelas setas; duplo clique volta aos 520 px) e fica guardada no navegador, por usuário; a tela cheia
 * cobre a janela e não fica guardada. Não há confirmação ao fechar — fechar salva.
 */
@Component({
  selector: 'app-usuario-anotacoes-dialog',
  standalone: true,
  imports: [ButtonModule, DrawerModule, TooltipModule, PadPainelComponent],
  templateUrl: './usuario-anotacoes-dialog.component.html',
  styleUrl: './usuario-anotacoes-dialog.component.scss',
})
export class UsuarioAnotacoesDialogComponent {
  private readonly pad = inject(PadService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly destroyRef = inject(DestroyRef);

  /** Falso mostra cada seção só no visualizador, sem salvar e sem "Limpar". */
  readonly editavel = input(true);

  /** Emitido a cada salvamento bem-sucedido, para a listagem atualizar o ícone sem recarregar. */
  readonly aoAlterar = output<AnotacoesAlteradasEvento>();

  readonly largura = LARGURA_DO_PAD;
  readonly visivel = signal(false);
  readonly cheio = signal(false);
  readonly arrastando = signal(false);
  private readonly larguraDaJanela = signal(window.innerWidth);
  private readonly larguraGuardada = signal<number>(LARGURA_DO_PAD.padrao);
  /** A largura de agora, sempre dentro dos limites da janela. */
  readonly larguraEfetiva = computed(() => limitarLarguraDoPad(this.larguraGuardada(), this.larguraDaJanela()));
  readonly larguraMaxima = computed(() => larguraMaximaDoPad(this.larguraDaJanela()));

  constructor() {
    const cancelar = this.pad.observarAlteracoes((evento) => this.aoAlterar.emit(evento));
    this.destroyRef.onDestroy(() => {
      cancelar();
      // A página saiu de cena: nada digitado ou limpo pode ficar para trás.
      this.pad.encerrar();
    });
  }

  @HostListener('window:resize')
  aoRedimensionarJanela(): void {
    this.larguraDaJanela.set(window.innerWidth);
  }

  /** Abre o drawer para o usuário informado; sem `nomeCompleto`, usa o devolvido pela API. */
  abrir(usuarioId: number, nomeCompleto = ''): void {
    this.cheio.set(false);
    this.larguraDaJanela.set(window.innerWidth);
    this.larguraGuardada.set(this.lerLarguraGuardada());
    this.pad.abrir(usuarioId, nomeCompleto, { aoReabrir: () => this.visivel.set(true), aoFalhar: () => this.visivel.set(false) });
    this.visivel.set(true);
  }

  /** X, Esc ou clique fora: fechar salva — sem confirmação. */
  aoMudarVisibilidade(visivel: boolean): void {
    if (visivel) return;
    this.visivel.set(false);
    this.arrastando.set(false);
    this.pad.fechar();
  }

  alternarTelaCheia(): void {
    this.cheio.update((atual) => !atual);
  }

  iniciarArrasto(evento: PointerEvent): void {
    evento.preventDefault();
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
    this.arrastando.set(true);
  }

  aoArrastar(evento: PointerEvent): void {
    if (!this.arrastando()) return;
    this.larguraGuardada.set(larguraDoPadPeloPonteiro(evento.clientX, this.larguraDaJanela()));
  }

  finalizarArrasto(): void {
    if (!this.arrastando()) return;
    this.arrastando.set(false);
    this.guardarLargura();
  }

  /** Setas ajustam a alça pelo teclado: ← alarga o pad, → estreita. */
  aoTeclarNaAlca(evento: KeyboardEvent): void {
    const passo = evento.key === 'ArrowLeft' ? LARGURA_DO_PAD.passoDoTeclado : evento.key === 'ArrowRight' ? -LARGURA_DO_PAD.passoDoTeclado : 0;
    if (passo === 0) return;
    evento.preventDefault();
    this.larguraGuardada.set(limitarLarguraDoPad(this.larguraEfetiva() + passo, this.larguraDaJanela()));
    this.guardarLargura();
  }

  /** Duplo clique na alça: volta aos 520 px. */
  restaurarLargura(): void {
    this.larguraGuardada.set(LARGURA_DO_PAD.padrao);
    this.guardarLargura();
  }

  private chaveDaLargura(): string {
    return `pad.largura.${this.sessao.id() ?? 0}`;
  }

  private lerLarguraGuardada(): number {
    try {
      const guardada = localStorage.getItem(this.chaveDaLargura());
      return guardada === null ? LARGURA_DO_PAD.padrao : Number(guardada);
    } catch {
      return LARGURA_DO_PAD.padrao;
    }
  }

  private guardarLargura(): void {
    try {
      localStorage.setItem(this.chaveDaLargura(), String(this.larguraGuardada()));
    } catch {
      // Sem armazenamento (janela privada, dados bloqueados): a alça funciona, só não lembra.
    }
  }
}
