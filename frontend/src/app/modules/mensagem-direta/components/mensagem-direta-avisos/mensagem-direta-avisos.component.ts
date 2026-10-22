import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MensagemDiretaAvisosService } from '../../services/mensagem-direta-avisos.service';
import { MensagemDiretaEstadoService } from '../../services/mensagem-direta-estado.service';
import { AvisoNaTela, DURACAO_DO_AVISO_MS, rotuloDaQuantidade } from '../../utils/avisos.util';
import { MensagemDiretaAvatarComponent } from '../mensagem-direta-avatar/mensagem-direta-avatar.component';

/** O tempo mínimo que sobra de um cartão que o mouse largou: não some no mesmo instante em que o usuário tira o ponteiro. */
const TEMPO_MINIMO_DEPOIS_DE_PAUSAR_MS = 2_000;

type MotivoDaPausa = 'mouse' | 'foco';

interface Temporizador {
  atualizadoEm: number;
  restante: number;
  inicio: number;
  manipulador: ReturnType<typeof setTimeout> | null;
}

/**
 * Os cartões de aviso de mensagem nova (task 212), no canto superior direito. Cada um some sozinho em 8 s; o mouse ou o foco em cima pausam a contagem.
 * Mensagens seguidas da mesma pessoa atualizam o mesmo cartão e reiniciam o tempo. Quem decide se um aviso aparece é a regra pura `decidirAviso`.
 */
@Component({
  selector: 'app-mensagem-direta-avisos',
  standalone: true,
  imports: [ButtonModule, TooltipModule, MensagemDiretaAvatarComponent],
  templateUrl: './mensagem-direta-avisos.component.html',
  styleUrl: './mensagem-direta-avisos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MensagemDiretaAvisosComponent {
  private readonly servico = inject(MensagemDiretaAvisosService);
  private readonly estado = inject(MensagemDiretaEstadoService);

  protected readonly avisos = this.servico.avisos;
  protected readonly rotuloDaQuantidade = rotuloDaQuantidade;

  private readonly temporizadores = new Map<string, Temporizador>();
  /** Quem está segurando a contagem de cada cartão (o mouse e o foco são independentes: ela só volta quando os dois saem). */
  private readonly pausados = new Map<string, Set<MotivoDaPausa>>();

  constructor() {
    // A cada mudança nos cartões: o novo ou o atualizado começa a contagem do zero; o que saiu perde o temporizador.
    effect(() => {
      const atuais = this.avisos();
      const ids = new Set(atuais.map((aviso) => aviso.id));
      for (const [id, temporizador] of [...this.temporizadores]) {
        if (!ids.has(id)) {
          this.parar(temporizador);
          this.temporizadores.delete(id);
          this.pausados.delete(id);
        }
      }
      for (const aviso of atuais) {
        const existente = this.temporizadores.get(aviso.id);
        if (existente && existente.atualizadoEm === aviso.atualizadoEm) continue;
        if (existente) this.parar(existente);
        const novo: Temporizador = { atualizadoEm: aviso.atualizadoEm, restante: DURACAO_DO_AVISO_MS, inicio: 0, manipulador: null };
        this.temporizadores.set(aviso.id, novo);
        if (!this.pausados.get(aviso.id)?.size) this.iniciar(aviso.id, novo);
      }
    });
    inject(DestroyRef).onDestroy(() => this.temporizadores.forEach((temporizador) => this.parar(temporizador)));
  }

  private iniciar(id: string, temporizador: Temporizador): void {
    temporizador.inicio = Date.now();
    temporizador.manipulador = setTimeout(() => this.servico.fechar(id), temporizador.restante);
  }

  private parar(temporizador: Temporizador): void {
    if (temporizador.manipulador) clearTimeout(temporizador.manipulador);
    temporizador.manipulador = null;
  }

  protected pausar(id: string, motivo: MotivoDaPausa): void {
    const motivos = this.pausados.get(id) ?? new Set<MotivoDaPausa>();
    motivos.add(motivo);
    this.pausados.set(id, motivos);
    const temporizador = this.temporizadores.get(id);
    if (!temporizador?.manipulador) return;
    this.parar(temporizador);
    temporizador.restante = Math.max(TEMPO_MINIMO_DEPOIS_DE_PAUSAR_MS, temporizador.restante - (Date.now() - temporizador.inicio));
  }

  protected retomar(id: string, motivo: MotivoDaPausa): void {
    const motivos = this.pausados.get(id);
    motivos?.delete(motivo);
    if (motivos?.size) return;
    this.pausados.delete(id);
    const temporizador = this.temporizadores.get(id);
    if (temporizador && !temporizador.manipulador) this.iniciar(id, temporizador);
  }

  protected abrir(aviso: AvisoNaTela): void {
    void this.estado.abrirConversaDoAviso(aviso.usuarioId, aviso.usuarioNome, aviso.id);
  }

  protected fechar(id: string): void {
    this.servico.fechar(id);
  }
}
