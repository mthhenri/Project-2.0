import { Component, computed, inject, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { StatusPropostaIaEnum, TipoAtividadePrioridadeEnum } from '@project20/shared';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { DiffPorPalavraComponent } from '../../../../shared/components/diff-por-palavra/diff-por-palavra.component';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { ResumoDaProposta } from '../../utils/proposta-compacta.util';
import { ROTULO_STATUS_PROPOSTA, SEVERIDADE_STATUS_PROPOSTA } from '../../utils/chat.util';

/** Como a linha se mostra: esperando o usuário, feita (com Desfazer) ou encerrada sem ação (recusada, expirada, desfeita). */
export type ModoDaLinha = 'PENDENTE' | 'FEITA' | 'ENCERRADA';

/**
 * A proposta da IA numa linha só (task 226): a ação, o nome, o que muda e, se pendente, ✓ (confirmar), lápis (ajustar) e × (recusar). Depois
 * de confirmada vira uma linha verde com Desfazer enquanto vale o prazo; se a IA executou sozinha, é a linha azul de aviso, com o ícone da IA. A linha não decide nada: o cartão (`app-chat-proposta-cartao`)
 * escolhe o modo e executa as ações; o botão de detalhes abre o cartão grande no mesmo lugar.
 */
@Component({
  selector: 'app-chat-proposta-linha',
  standalone: true,
  imports: [ButtonModule, TagModule, TooltipModule, DiffPorPalavraComponent, PrioridadeSeloComponent],
  templateUrl: './proposta-linha.component.html',
  styleUrl: './proposta-linha.component.scss',
})
export class PropostaLinhaComponent {
  private readonly prioridadeService = inject(AtividadePrioridadeService);

  readonly resumo = input.required<ResumoDaProposta>();
  readonly modo = input.required<ModoDaLinha>();
  readonly status = input.required<StatusPropostaIaEnum>();
  readonly podeAjustar = input(false);
  readonly operando = input(false);
  /** Dentro do prazo de desfazer (a linha "feita" só mostra o botão enquanto vale). */
  readonly desfazerDisponivel = input(false);
  /** A IA executou sozinha (nível "Faz e avisa", task 228): a linha vira o aviso da IA, com o ícone dela, em vez do "feito" do usuário. */
  readonly feitaPelaIa = input(false);

  readonly confirmar = output<void>();
  readonly ajustar = output<void>();
  readonly recusar = output<void>();
  readonly desfazer = output<void>();
  readonly detalhar = output<void>();

  readonly rotuloStatus = ROTULO_STATUS_PROPOSTA;
  readonly severidade = SEVERIDADE_STATUS_PROPOSTA;
  readonly rotuloDaLinha = computed(() => `Proposta: ${this.resumo().acao}`);
  /** O aviso da IA só existe na linha de "feito". */
  readonly avisoDaIa = computed(() => this.modo() === 'FEITA' && this.feitaPelaIa());

  /** A prioridade como o selo pede (descrição e cor do cache; sem cache, o código e um cinza). */
  prioridadeDe(codigo: string): { codigo: TipoAtividadePrioridadeEnum; descricao: string; cor: string } {
    const encontrada = this.prioridadeService.prioridades().find((item) => item.codigo === codigo);
    return encontrada ?? { codigo: codigo as TipoAtividadePrioridadeEnum, descricao: codigo, cor: '#94a3b8' };
  }
}
