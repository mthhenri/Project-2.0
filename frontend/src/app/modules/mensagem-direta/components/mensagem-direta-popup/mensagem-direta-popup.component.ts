import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, OnDestroy, OnInit, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { ProjectDesktopService } from '../../../../core/services/project-desktop.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { MensagemDiretaPosicaoService } from '../../services/mensagem-direta-posicao.service';
import { AVISO_DE_LEITURA_DAS_CONVERSAS } from '../../utils/mensagem-direta.util';
import { CantoDoPopup, PASSO_DO_TECLADO_PX, PASSO_GRANDE_DO_TECLADO_PX, Retangulo, moverPopup, redimensionarPopup } from '../../utils/posicao-popup.util';
import { MensagemDiretaConversaComponent } from '../mensagem-direta-conversa/mensagem-direta-conversa.component';
import { MensagemDiretaListaComponent } from '../mensagem-direta-lista/mensagem-direta-lista.component';
import { MensagemDiretaNovaComponent } from '../mensagem-direta-nova/mensagem-direta-nova.component';

/**
 * O popup do chat entre colaboradores (task 210): um painel fixo, por padrão no canto inferior direito, 392×640 (a posição preferida e o que o usuário arrasta ou
 * redimensiona, task 221, vêm do `MensagemDiretaPosicaoService`), aberto pelo botão do topbar. Vive no layout,
 * então o stream de eventos fica aberto (e as não lidas contadas) enquanto o usuário está no Project, com o popup aberto ou não.
 *
 * No Project Desktop (task 213) ele também atende o atalho global (abre o popup, com o código copiado) e a janela de chat flutuante, que o mostra
 * preenchendo a janela (`emJanela`): ali ocultar o chat fecha a janela.
 */
@Component({
  selector: 'app-mensagem-direta-popup',
  standalone: true,
  imports: [TooltipModule, MensagemDiretaListaComponent, MensagemDiretaConversaComponent, MensagemDiretaNovaComponent],
  templateUrl: './mensagem-direta-popup.component.html',
  styleUrl: './mensagem-direta-popup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaPopupComponent implements OnInit, OnDestroy {
  protected readonly estado = inject(MensagemDiretaEstadoService);
  protected readonly avisoDeLeitura = AVISO_DE_LEITURA_DAS_CONVERSAS;
  private readonly desktop = inject(ProjectDesktopService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly posicao = inject(MensagemDiretaPosicaoService);

  protected readonly retangulo = this.posicao.retangulo;
  protected readonly cantoDaAlca = this.posicao.cantoDaAlca;
  /** Há um arrasto ou um redimensionamento em curso (o popup fica sem seleção de texto). */
  protected readonly gestoEmCurso = signal(false);
  private gesto: { tipo: 'MOVER' | 'REDIMENSIONAR'; ponteiro: number; inicioX: number; inicioY: number; inicial: Retangulo; alca: CantoDoPopup; arranjoAntes: Retangulo | null } | null = null;

  /** Dentro da janela de chat do Desktop: preenche a janela (sem posição fixa) e tem a faixa de arrasto. */
  readonly emJanela = input(false);

  constructor() {
    effect(() => {
      if (this.emJanela() && !this.estado.aberto()) this.desktop.fecharChat();
    });
  }

  /** A janela do navegador mudou de tamanho: o popup é relimitado a ela (nunca some nem passa da margem). */
  @HostListener('window:resize')
  protected aoRedimensionarAJanela(): void {
    this.posicao.atualizarJanela();
  }

  /**
   * Começa o arrasto (cabeçalho, fora dos botões e campos dele) ou o redimensionamento (alça). Na janela do Desktop não há nada disso: ela tem a própria faixa de arrasto.
   */
  protected aoApertar(evento: PointerEvent): void {
    if (this.emJanela() || evento.button !== 0) return;
    const alvo = evento.target as HTMLElement | null;
    if (!alvo?.closest) return;
    const naAlca = alvo.closest('[data-popup-alca]') !== null;
    const noCabecalho = !naAlca && alvo.closest('[data-popup-arrasto]') !== null && alvo.closest('button, input, a, select, textarea, [data-popup-arrasto-ignorar]') === null;
    if (!naAlca && !noCabecalho) return;
    evento.preventDefault();
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
    this.gesto = {
      tipo: naAlca ? 'REDIMENSIONAR' : 'MOVER',
      ponteiro: evento.pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      inicial: this.retangulo(),
      alca: this.cantoDaAlca(),
      arranjoAntes: this.posicao.arranjo(),
    };
    this.gestoEmCurso.set(true);
  }

  protected aoMoverOPonteiro(evento: PointerEvent): void {
    const gesto = this.gesto;
    if (!gesto || evento.pointerId !== gesto.ponteiro) return;
    const deltaX = evento.clientX - gesto.inicioX;
    const deltaY = evento.clientY - gesto.inicioY;
    const janela = this.posicao.janela();
    this.posicao.arranjo.set(
      gesto.tipo === 'MOVER' ? moverPopup(gesto.inicial, deltaX, deltaY, janela) : redimensionarPopup(gesto.inicial, gesto.alca, deltaX, deltaY, janela),
    );
  }

  /** Solta o ponteiro: o que foi feito vira o arranjo guardado (só se algo mudou; um clique no cabeçalho não grava nada). */
  protected aoSoltar(evento: PointerEvent): void {
    const gesto = this.gesto;
    if (!gesto || evento.pointerId !== gesto.ponteiro) return;
    this.gesto = null;
    this.gestoEmCurso.set(false);
    const final = this.posicao.arranjo();
    if (final && (final.esquerda !== gesto.inicial.esquerda || final.topo !== gesto.inicial.topo || final.largura !== gesto.inicial.largura || final.altura !== gesto.inicial.altura)) {
      this.posicao.definir(final);
    } else {
      // Sem mudança (um clique): o arranjo de antes continua valendo.
      this.posicao.arranjo.set(gesto.arranjoAntes);
    }
  }

  /** Com o foco na alça, as setas puxam o canto dela (16 px; 64 px com Shift): o redimensionar não depende só do mouse. */
  protected aoTeclarNaAlca(evento: KeyboardEvent): void {
    const passo = evento.shiftKey ? PASSO_GRANDE_DO_TECLADO_PX : PASSO_DO_TECLADO_PX;
    const direcao: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] };
    const delta = direcao[evento.key];
    if (!delta) return;
    evento.preventDefault();
    this.posicao.definir(redimensionarPopup(this.retangulo(), this.cantoDaAlca(), delta[0], delta[1], this.posicao.janela()));
  }

  ngOnInit(): void {
    this.estado.iniciar();
    if (this.emJanela()) {
      // Na janela do Desktop o foco começa no `body`: o Esc só chegaria à seção dentro da conversa, então é ouvido no documento.
      const aoApertarEsc = (evento: KeyboardEvent): void => {
        if (evento.key === 'Escape' && !evento.defaultPrevented) this.estado.fechar();
      };
      document.addEventListener('keydown', aoApertarEsc);
      this.destroyRef.onDestroy(() => document.removeEventListener('keydown', aoApertarEsc));
      return;
    }
    // O Project à vista atende o atalho e as rotas pedidas pela janela de chat (links de demanda e atividade abrem aqui).
    const soltarChat = this.desktop.aoPedirChat((areaDeTransferencia) => this.estado.abrirPeloDesktop(areaDeTransferencia));
    const soltarNavegacao = this.desktop.aoPedirNavegacao((caminho) => void this.router.navigateByUrl(caminho));
    this.destroyRef.onDestroy(() => {
      soltarChat();
      soltarNavegacao();
    });
  }

  ngOnDestroy(): void {
    this.estado.parar();
  }
}
