import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { PropostaIaResumoDto, StandardResponse, StatusPropostaIaEnum, TipoAtividadePrioridadeEnum, TipoPropostaIaEnum } from '@project20/shared';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
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
 * Tem resumo e "Ajustar" próprios para criar atividade, iniciar e pausar execução (task 145); os demais tipos (blocos 8 e 9) mostram os
 * dados como pares e só oferecem Confirmar e Recusar até ganharem o resumo deles.
 * Nada roda sem o clique de Confirmar. Um 409 (já resolvida em outro lugar) recarrega o cartão.
 */
@Component({
  selector: 'app-chat-proposta-cartao',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, SkeletonModule, TagModule, TextareaModule, PrioridadeSeloComponent],
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
  readonly Tipo = TipoPropostaIaEnum;
  protected readonly prioridadeService = inject(AtividadePrioridadeService);

  /** O formulário de "Ajustar" (só os campos do tipo da proposta valem). */
  readonly ajustando = signal(false);
  readonly formularioAjuste = new FormGroup({
    nome: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(255)] }),
    descricao: new FormControl('', { nonNullable: true }),
    prioridade: new FormControl<TipoAtividadePrioridadeEnum>(TipoAtividadePrioridadeEnum.INDEFINIDA, { nonNullable: true }),
  });

  private static readonly TIPOS_AJUSTAVEIS: TipoPropostaIaEnum[] = [
    TipoPropostaIaEnum.CRIAR_ATIVIDADE,
    TipoPropostaIaEnum.INICIAR_EXECUCAO,
    TipoPropostaIaEnum.PAUSAR_EXECUCAO,
  ];
  /** Pendente e de um tipo que sabe ser ajustado. */
  readonly podeAjustar = computed(() => {
    const atual = this.proposta();
    return !!atual && atual.status === StatusPropostaIaEnum.PENDENTE && PropostaCartaoComponent.TIPOS_AJUSTAVEIS.includes(atual.tipo);
  });

  constructor() {
    this.prioridadeService.carregar();
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

  /** Um dado da proposta como texto (vazio se não houver). */
  texto(chave: string): string {
    const valor = this.proposta()?.dados[chave];
    return typeof valor === 'string' ? valor : '';
  }

  prioridadeDe(codigo: string): { codigo: TipoAtividadePrioridadeEnum; descricao: string; cor: string } {
    const encontrada = this.prioridadeService.prioridades().find((item) => item.codigo === codigo);
    return encontrada ?? { codigo: codigo as TipoAtividadePrioridadeEnum, descricao: codigo, cor: '#94a3b8' };
  }

  abrirAjuste(): void {
    const atual = this.proposta();
    if (!atual) return;
    this.formularioAjuste.reset({
      nome: this.texto('nome'),
      descricao: this.texto('descricao'),
      prioridade: (this.texto('prioridade') || TipoAtividadePrioridadeEnum.INDEFINIDA) as TipoAtividadePrioridadeEnum,
    });
    this.ajustando.set(true);
  }

  cancelarAjuste(): void {
    this.ajustando.set(false);
  }

  /** Confirma já com os campos corrigidos; os nomes de exibição continuam como a IA propôs. */
  confirmarAjuste(): void {
    const atual = this.proposta();
    if (!atual) return;
    const valores = this.formularioAjuste.getRawValue();
    const dados: Record<string, unknown> = { ...atual.dados };
    if (atual.tipo === TipoPropostaIaEnum.CRIAR_ATIVIDADE) {
      if (this.formularioAjuste.controls.nome.invalid) {
        this.formularioAjuste.controls.nome.markAsTouched();
        return;
      }
      dados['nome'] = valores.nome.trim();
      dados['prioridade'] = valores.prioridade;
    } else if (atual.tipo === TipoPropostaIaEnum.INICIAR_EXECUCAO) {
      dados['descricao'] = valores.descricao.trim();
    } else if (atual.tipo === TipoPropostaIaEnum.PAUSAR_EXECUCAO) {
      const descricao = valores.descricao.trim();
      if (descricao) dados['descricao'] = descricao;
      else delete dados['descricao'];
    }
    const id = this.propostaId();
    this.executar(this.propostaIaService.ajustar(id, { dados }), () => {
      this.ajustando.set(false);
      this.desfazerService.oferecer({
        mensagem: 'Proposta ajustada e confirmada',
        desfazer: () => this.propostaIaService.desfazer(id),
        aposDesfazer: () => this.carregar(id),
      });
    });
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
