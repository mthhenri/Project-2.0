import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, effect, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectDesktopService } from '../../../../core/services/project-desktop.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { AVISO_DE_LEITURA_DAS_CONVERSAS } from '../../utils/mensagem-direta.util';
import { MensagemDiretaConversaComponent } from '../mensagem-direta-conversa/mensagem-direta-conversa.component';
import { MensagemDiretaListaComponent } from '../mensagem-direta-lista/mensagem-direta-lista.component';
import { MensagemDiretaNovaComponent } from '../mensagem-direta-nova/mensagem-direta-nova.component';

/**
 * O popup do chat entre colaboradores (task 210): um painel fixo no canto inferior direito, 392×640, aberto pelo botão do topbar. Vive no layout,
 * então o stream de eventos fica aberto (e as não lidas contadas) enquanto o usuário está no Project, com o popup aberto ou não.
 *
 * No Project Desktop (task 213) ele também atende o atalho global (abre o popup, com o código copiado) e a janela de chat flutuante, que o mostra
 * preenchendo a janela (`emJanela`): ali ocultar o chat fecha a janela.
 */
@Component({
  selector: 'app-mensagem-direta-popup',
  standalone: true,
  imports: [MensagemDiretaListaComponent, MensagemDiretaConversaComponent, MensagemDiretaNovaComponent],
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

  /** Dentro da janela de chat do Desktop: preenche a janela (sem posição fixa) e tem a faixa de arrasto. */
  readonly emJanela = input(false);

  constructor() {
    effect(() => {
      if (this.emJanela() && !this.estado.aberto()) this.desktop.fecharChat();
    });
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
