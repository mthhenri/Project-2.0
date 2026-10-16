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
    this.cancelarTemporizador();
    this.oferta.set(oferta);
    this.temporizador = setTimeout(() => {
      if (this.oferta() === oferta) this.oferta.set(null);
    }, VIDA_TOAST_DESFAZER_MS);
  }

  /** Botão "Fechar" do toast: dispensa a oferta sem desfazer. */
  dispensar(): void {
    this.cancelarTemporizador();
    this.oferta.set(null);
  }

  /** Botão "Desfazer" do toast. */
  executar(): void {
    const oferta = this.oferta();
    this.dispensar();
    if (!oferta) return;

    oferta.desfazer().subscribe({
      next: () => {
        oferta.aposDesfazer?.();
        this.messageService.add({ severity: 'info', summary: 'Desfeito', detail: 'Ação desfeita' });
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
