import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TextareaModule } from 'primeng/textarea';
import { PlanoPontoResumoDto, TipoPlanoPontoSituacaoEnum } from '@project20/shared';
import { PlanoService } from '../../services/plano.service';

/** O que a pessoa está fazendo com um ponto: o texto que o fecha e o rótulo do campo. */
interface Tratamento {
  pontoId: number;
  situacao: TipoPlanoPontoSituacaoEnum;
}

const ROTULO_DO_CAMPO: Partial<Record<TipoPlanoPontoSituacaoEnum, string>> = {
  [TipoPlanoPontoSituacaoEnum.RESOLVIDO]: 'Resposta que resolve o ponto',
  [TipoPlanoPontoSituacaoEnum.DECISAO]: 'Decisão tomada',
  [TipoPlanoPontoSituacaoEnum.DISPENSADO]: 'Motivo (opcional)',
};

export const ROTULO_DA_SITUACAO_DO_PONTO: Record<TipoPlanoPontoSituacaoEnum, string> = {
  [TipoPlanoPontoSituacaoEnum.ABERTO]: 'Em aberto',
  [TipoPlanoPontoSituacaoEnum.RESOLVIDO]: 'Resolvido',
  [TipoPlanoPontoSituacaoEnum.DISPENSADO]: 'Dispensado',
  [TipoPlanoPontoSituacaoEnum.DECISAO]: 'Decisão',
};

/**
 * Painel dos pontos em aberto do plano (task 235): o que a IA (ou a pessoa) anotou e ainda não foi respondido, com os já fechados numa seção
 * recolhível. A pessoa anota, resolve, dispensa (com motivo opcional), registra a decisão e reabre à mão. O rótulo é texto livre.
 * Análogo visual: o painel de abas do documento (233).
 */
@Component({
  selector: 'app-plano-pontos',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SkeletonModule, TextareaModule],
  templateUrl: './plano-pontos.component.html',
  styleUrl: './plano-pontos.component.scss',
})
export class PlanoPontosComponent {
  readonly planoId = input.required<number>();

  private readonly planoService = inject(PlanoService);
  private readonly messageService = inject(MessageService);

  readonly Situacao = TipoPlanoPontoSituacaoEnum;
  readonly rotuloDaSituacao = ROTULO_DA_SITUACAO_DO_PONTO;

  readonly pontos = signal<PlanoPontoResumoDto[]>([]);
  readonly carregando = signal(true);
  readonly erro = signal(false);
  readonly ocupado = signal(false);
  /** O painel inteiro aberto ou recolhido (aberto por padrão). */
  readonly aberto = signal(true);
  readonly fechadosVisiveis = signal(false);
  readonly anotando = signal(false);
  readonly tratando = signal<Tratamento | null>(null);

  readonly abertos = computed(() => this.pontos().filter((ponto) => ponto.situacao === TipoPlanoPontoSituacaoEnum.ABERTO));
  readonly fechados = computed(() => this.pontos().filter((ponto) => ponto.situacao !== TipoPlanoPontoSituacaoEnum.ABERTO));
  readonly rotuloDoCampoTratado = computed(() => ROTULO_DO_CAMPO[this.tratando()?.situacao ?? TipoPlanoPontoSituacaoEnum.RESOLVIDO] ?? '');

  readonly controleRotulo = new FormControl<string>('', { nonNullable: true });
  readonly controleTexto = new FormControl<string>('', { nonNullable: true });
  readonly controleResolucao = new FormControl<string>('', { nonNullable: true });

  constructor() {
    effect(() => {
      const id = this.planoId();
      untracked(() => this.recarregar(id));
    });
  }

  /** Relê os pontos (a IA pode ter anotado ou fechado algum). Sem esqueleto numa releitura: a lista já está na tela. */
  recarregar(id: number = this.planoId()): void {
    if (this.pontos().length === 0) this.carregando.set(true);
    this.erro.set(false);
    this.planoService.listarPontos(id).subscribe({
      next: (resposta) => {
        if (id !== this.planoId()) return;
        this.pontos.set(resposta.dados ?? []);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set(true);
        this.carregando.set(false);
      },
    });
  }

  alternarAnotacao(): void {
    this.anotando.update((atual) => !atual);
    this.controleRotulo.setValue('');
    this.controleTexto.setValue('');
  }

  anotar(): void {
    const rotulo = this.controleRotulo.value.trim() || 'Ponto';
    const texto = this.controleTexto.value.trim();
    if (texto === '' || this.ocupado()) return;
    this.ocupado.set(true);
    this.planoService.criarPonto(this.planoId(), rotulo, texto).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.anotando.set(false);
        this.recarregar();
      },
      error: (falha: HttpErrorResponse) => this.falhar(falha, 'Não foi possível anotar o ponto'),
    });
  }

  /** Abre o campo do texto para fechar o ponto de um jeito (resolver, decisão ou dispensar). */
  tratar(ponto: PlanoPontoResumoDto, situacao: TipoPlanoPontoSituacaoEnum): void {
    this.controleResolucao.setValue('');
    this.tratando.set({ pontoId: ponto.id, situacao });
  }

  cancelarTratamento(): void {
    this.tratando.set(null);
  }

  /** Resolver e decisão exigem o texto; dispensar vale com o campo vazio. */
  confirmarTratamento(): void {
    const atual = this.tratando();
    if (!atual || this.ocupado()) return;
    const texto = this.controleResolucao.value.trim();
    if (atual.situacao !== TipoPlanoPontoSituacaoEnum.DISPENSADO && texto === '') return;
    this.alterarSituacao(atual.pontoId, atual.situacao, texto);
  }

  reabrir(ponto: PlanoPontoResumoDto): void {
    this.alterarSituacao(ponto.id, TipoPlanoPontoSituacaoEnum.ABERTO);
  }

  precisaDeTexto(): boolean {
    const situacao = this.tratando()?.situacao;
    return situacao === TipoPlanoPontoSituacaoEnum.RESOLVIDO || situacao === TipoPlanoPontoSituacaoEnum.DECISAO;
  }

  private alterarSituacao(pontoId: number, situacao: TipoPlanoPontoSituacaoEnum, texto?: string): void {
    this.ocupado.set(true);
    this.planoService.alterarSituacaoDoPonto(this.planoId(), pontoId, situacao, texto).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.tratando.set(null);
        this.recarregar();
      },
      error: (falha: HttpErrorResponse) => this.falhar(falha, 'Não foi possível alterar o ponto'),
    });
  }

  private falhar(falha: HttpErrorResponse, mensagemPadrao: string): void {
    this.ocupado.set(false);
    this.messageService.add({ severity: 'warn', summary: 'Plano', detail: falha.error?.mensagem ?? mensagemPadrao });
  }
}
