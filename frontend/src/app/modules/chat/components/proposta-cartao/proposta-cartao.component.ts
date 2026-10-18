import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { PropostaIaResumoDto, StandardResponse, StatusPropostaIaEnum } from '@project20/shared';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { PropostaIaService } from '../../services/proposta-ia.service';
import {
  ROTULO_STATUS_PROPOSTA,
  ROTULO_TIPO_PROPOSTA,
  SEVERIDADE_STATUS_PROPOSTA,
  paresDosDados,
} from '../../utils/chat.util';

/**
 * Cartão de uma proposta da IA no chat (task 139): o que a IA quer fazer, em que situação está e os botões coerentes com ela.
 * Genérico: mostra os dados como pares; o resumo e o formulário de "Ajustar" por tipo chegam com os executores (blocos 6, 8 e 9).
 * Nada roda sem o clique de Confirmar. Um 409 (já resolvida em outro lugar) recarrega o cartão.
 */
@Component({
  selector: 'app-chat-proposta-cartao',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, TagModule],
  templateUrl: './proposta-cartao.component.html',
  styleUrl: './proposta-cartao.component.scss',
})
export class PropostaCartaoComponent {
  private readonly propostaIaService = inject(PropostaIaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);

  readonly propostaId = input.required<number>();

  readonly proposta = signal<PropostaIaResumoDto | null>(null);
  readonly erro = signal(false);
  readonly operando = signal(false);

  readonly Status = StatusPropostaIaEnum;
  readonly rotuloTipo = ROTULO_TIPO_PROPOSTA;
  readonly rotuloStatus = ROTULO_STATUS_PROPOSTA;
  readonly severidade = SEVERIDADE_STATUS_PROPOSTA;
  readonly paresDosDados = paresDosDados;

  constructor() {
    effect(() => {
      const id = this.propostaId();
      untracked(() => this.carregar(id));
    });
  }

  carregar(id: number = this.propostaId()): void {
    this.erro.set(false);
    this.propostaIaService.recuperarPorId(id).subscribe({
      next: (resposta) => this.proposta.set(resposta.dados ?? null),
      error: () => this.erro.set(true),
    });
  }

  confirmar(): void {
    const id = this.propostaId();
    this.executar(this.propostaIaService.confirmar(id), () =>
      this.desfazerService.oferecer({
        mensagem: 'Proposta confirmada',
        desfazer: () => this.propostaIaService.desfazer(id),
        aposDesfazer: () => this.carregar(id),
      }),
    );
  }

  recusar(): void {
    this.executar(this.propostaIaService.recusar(this.propostaId()));
  }

  desfazer(): void {
    this.executar(this.propostaIaService.desfazer(this.propostaId()));
  }

  private executar(chamada: Observable<StandardResponse<PropostaIaResumoDto>>, aoSucesso?: () => void): void {
    if (this.operando()) return;
    this.operando.set(true);
    chamada.subscribe({
      next: (resposta) => {
        this.operando.set(false);
        this.proposta.set(resposta.dados ?? null);
        aoSucesso?.();
      },
      error: (erro: HttpErrorResponse) => {
        this.operando.set(false);
        const mensagem = erro.error?.mensagem ?? 'Não foi possível concluir a ação';
        // Já resolvida em outro lugar: mostra a situação de hoje em vez de insistir.
        if (erro.status === 409) this.carregar();
        this.messageService.add({ severity: erro.status === 409 ? 'info' : 'warn', summary: 'Proposta', detail: mensagem });
      },
    });
  }
}
