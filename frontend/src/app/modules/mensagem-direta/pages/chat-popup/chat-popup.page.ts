import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectDesktopService } from '../../../../core/services/project-desktop.service';
import { MensagemDiretaPopupComponent } from '../../components/mensagem-direta-popup/mensagem-direta-popup.component';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';

/**
 * A janela de chat do Project Desktop (task 213), aberta pelo atalho global ou pelo clique numa notificação: a rota `/chat-popup`, sem menu nem barra
 * superior, com o mesmo chat do popup do Project preenchendo a janela. Abre numa conversa (`?usuarioId=&nome=`, do clique na notificação), no código
 * que o usuário copiou antes do atalho (entregue uma vez pelo Desktop) ou na lista. Links de demanda e atividade abrem no Project, nunca nesta janela.
 * No navegador comum a rota também funciona, só que sem o Desktop por trás.
 */
@Component({
  selector: 'app-chat-popup-page',
  standalone: true,
  imports: [MensagemDiretaPopupComponent],
  template: '<app-mensagem-direta-popup [emJanela]="true" />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPopupPage implements OnInit {
  private readonly estado = inject(MensagemDiretaEstadoService);
  private readonly avisos = inject(MensagemDiretaAvisosService);
  private readonly desktop = inject(ProjectDesktopService);
  private readonly rota = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // O Desktop só notifica o que o usuário não está lendo aqui.
    effect(() => this.desktop.informarConversa(this.estado.aberto() ? (this.estado.conversaAberta()?.usuarioId ?? null) : null));
  }

  ngOnInit(): void {
    // Esta janela é o chat: ela não avisa de mensagem nova (o aviso é do Project ou do Desktop).
    this.avisos.suprimido.set(true);
    this.destroyRef.onDestroy(() => this.avisos.suprimido.set(false));

    const parametros = this.rota.snapshot.queryParamMap;
    const usuarioId = Number(parametros.get('usuarioId'));
    const nome = parametros.get('nome');
    this.estado.abrir();
    if (Number.isInteger(usuarioId) && usuarioId > 0 && nome) {
      void this.estado.abrirConversa(usuarioId, nome);
    } else {
      void this.desktop.pegarRascunho().then((texto) => this.estado.abrirPeloDesktop(texto));
    }

    const soltarConversa = this.desktop.aoPedirConversa((id, nomeDaPessoa) => {
      this.estado.rascunhoDoDesktop.set(null);
      void this.estado.abrirConversa(id, nomeDaPessoa);
    });
    document.addEventListener('click', this.enviarLinkAoProject, true);
    this.destroyRef.onDestroy(() => {
      soltarConversa();
      document.removeEventListener('click', this.enviarLinkAoProject, true);
    });
  }

  /** Um link interno (cartão de demanda ou atividade) abre no Project: a navegação da janelinha ficaria sem menu e sem voltar. */
  private readonly enviarLinkAoProject = (evento: MouseEvent): void => {
    const link = (evento.target as Element | null)?.closest?.('a[href]');
    const destino = link?.getAttribute('href') ?? '';
    if (!destino.startsWith('/') || destino.startsWith('//')) return;
    evento.preventDefault();
    evento.stopPropagation();
    this.desktop.abrirNoProject(destino);
  };
}
