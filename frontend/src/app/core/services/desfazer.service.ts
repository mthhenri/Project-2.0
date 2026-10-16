import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';

/** Tempo em que o "Desfazer" fica disponível após a exclusão (task 99). */
export const VIDA_TOAST_DESFAZER_MS = 6000;

export interface OfertaDesfazer {
  /** Texto do toast, ex.: `Tag "Backend" excluída`. */
  mensagem: string;
  /** Chamada que reverte a ação (ex.: `PATCH :id/restaurar` ou o re-POST de uma associação). */
  desfazer: () => Observable<unknown>;
  /** Roda quando o desfazer deu certo — a tela devolve o item à lista. */
  aposDesfazer?: () => void;
  /** Texto do botão (padrão "Desfazer"); a task 114 usa "Reabrir" para um salvamento que falhou. */
  rotulo?: string;
  /** Quanto a oferta fica na tela (padrão `VIDA_TOAST_DESFAZER_MS`). */
  duracaoMs?: number;
  /** Texto do toast após o desfazer; `''` não mostra nada (padrão "Ação desfeita"). */
  mensagemAposDesfazer?: string;
  /** Roda quando a oferta termina sem desfazer (expirou, foi fechada ou substituída): é o momento de confirmar a ação. */
  aoEncerrar?: () => void;
}

/**
 * Exclusão com "Desfazer": a oferta aparece no `app-toast-desfazer` (layout) por 6 s.
 * Só a última oferta fica ativa — uma nova exclusão substitui a anterior, cujo dado continua
 * soft-deletado e recuperável pelo endpoint `restaurar`.
 */
@Injectable({ providedIn: 'root' })
export class DesfazerService {
  private readonly messageService = inject(MessageService);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  readonly oferta = signal<OfertaDesfazer | null>(null);

  oferecer(oferta: OfertaDesfazer): void {
    this.dispensar();
    this.oferta.set(oferta);
    this.temporizador = setTimeout(() => {
      if (this.oferta() === oferta) this.dispensar();
    }, oferta.duracaoMs ?? VIDA_TOAST_DESFAZER_MS);
  }

  /** Botão "Fechar" do toast: dispensa a oferta sem desfazer. */
  dispensar(): void {
    const ofertaAtual = this.oferta();
    this.cancelarTemporizador();
    this.oferta.set(null);
    ofertaAtual?.aoEncerrar?.();
  }

  /** Tira a oferta da tela sem acionar `aoEncerrar` (quem a ofereceu já resolveu a ação por conta própria). */
  dispensarSemEncerrar(): void {
    this.cancelarTemporizador();
    this.oferta.set(null);
  }

  /** Botão "Desfazer" do toast. */
  executar(): void {
    const oferta = this.oferta();
    if (!oferta) return;
    this.cancelarTemporizador();
    this.oferta.set(null);

    oferta.desfazer().subscribe({
      next: () => {
        oferta.aposDesfazer?.();
        const detalhe = oferta.mensagemAposDesfazer ?? 'Ação desfeita';
        if (detalhe) this.messageService.add({ severity: 'info', summary: 'Desfeito', detail: detalhe });
      },
    });
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
