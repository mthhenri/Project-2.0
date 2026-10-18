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
import { PropostaIaResumoDto, StandardResponse, StatusPropostaIaEnum, TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoPropostaIaEnum } from '@project20/shared';
import { AtividadeService } from '../../../atividade/services/atividade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { ROTULO_SECAO_ANOTACAO } from '../../../usuario/utils/anotacoes.util';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { PropostaIaService } from '../../services/proposta-ia.service';
import {
  ROTULO_STATUS_PROPOSTA,
  ROTULO_TIPO_PROPOSTA,
  SEVERIDADE_STATUS_PROPOSTA,
  formatarDuracao,
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
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, SelectModule, SkeletonModule, TagModule, TextareaModule, PrioridadeSeloComponent, MarkdownVisualizadorComponent],
  templateUrl: './proposta-cartao.component.html',
  styleUrl: './proposta-cartao.component.scss',
})
export class PropostaCartaoComponent {
  private readonly propostaIaService = inject(PropostaIaService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly sessao = inject(UsuarioSessaoService);

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
    /** Na descrição da demanda: os dois textos em Markdown (cada um só vale se a proposta o trouxe). */
    descricaoCliente: new FormControl('', { nonNullable: true }),
    descricaoTecnica: new FormControl('', { nonNullable: true }),
    /** No projeto proposto: o código único (a IA derivou um do nome). */
    codigo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2), Validators.maxLength(50)] }),
    prioridade: new FormControl<TipoAtividadePrioridadeEnum>(TipoAtividadePrioridadeEnum.INDEFINIDA, { nonNullable: true }),
    /** Na descrição do check-in: para qual atividade trocar depois (nulo é continuar na mesma). */
    atividadeSeguinteId: new FormControl<number | null>(null),
  });
  /** As atividades do usuário em que dá para começar uma execução (a escolha "Trocar para…" do check-in). */
  readonly atividadesParaTroca = signal<{ id: number; rotulo: string }[]>([]);
  readonly formatarDuracao = formatarDuracao;

  private static readonly TIPOS_AJUSTAVEIS: TipoPropostaIaEnum[] = [
    TipoPropostaIaEnum.CRIAR_ATIVIDADE,
    TipoPropostaIaEnum.CRIAR_PROJETO,
    TipoPropostaIaEnum.CRIAR_DEMANDA,
    TipoPropostaIaEnum.DESCREVER_DEMANDA,
    TipoPropostaIaEnum.INICIAR_EXECUCAO,
    TipoPropostaIaEnum.PAUSAR_EXECUCAO,
    TipoPropostaIaEnum.ANOTAR_PAD,
    TipoPropostaIaEnum.DESCREVER_EXECUCAO,
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

  /** Um dado numérico da proposta (0 se não houver). */
  numero(chave: string): number {
    const valor = this.proposta()?.dados[chave];
    return typeof valor === 'number' ? valor : 0;
  }

  /** O nome da seção do pad como a tela do pad mostra. */
  rotuloSecao(codigo: string): string {
    return (ROTULO_SECAO_ANOTACAO as Record<string, string>)[codigo] ?? codigo;
  }

  prioridadeDe(codigo: string): { codigo: TipoAtividadePrioridadeEnum; descricao: string; cor: string } {
    const encontrada = this.prioridadeService.prioridades().find((item) => item.codigo === codigo);
    return encontrada ?? { codigo: codigo as TipoAtividadePrioridadeEnum, descricao: codigo, cor: '#94a3b8' };
  }

  abrirAjuste(): void {
    const atual = this.proposta();
    if (!atual) return;
    // Na anotação do pad o campo editável é o texto novo: `texto` (anexar) ou `trechoNovo` (trocar).
    const textoDoPad = this.texto('operacao') === 'TROCAR' ? this.texto('trechoNovo') : this.texto('texto');
    this.formularioAjuste.reset({
      nome: this.texto('nome'),
      codigo: this.texto('codigo'),
      descricaoCliente: this.texto('descricaoCliente'),
      descricaoTecnica: this.texto('descricaoTecnica'),
      descricao: atual.tipo === TipoPropostaIaEnum.ANOTAR_PAD ? textoDoPad : this.texto('descricao'),
      atividadeSeguinteId: this.numero('atividadeSeguinteId') || null,
      prioridade: (this.texto('prioridade') || TipoAtividadePrioridadeEnum.INDEFINIDA) as TipoAtividadePrioridadeEnum,
    });
    if (atual.tipo === TipoPropostaIaEnum.DESCREVER_EXECUCAO) this.carregarAtividadesParaTroca();
    this.ajustando.set(true);
  }

  private carregarAtividadesParaTroca(): void {
    this.atividadeService
      .listar({ usuarioId: this.sessao.id() ?? undefined, status: [TipoAtividadeStatusEnum.PLANEJADA, TipoAtividadeStatusEnum.DESENVOLVENDO], itensPorPagina: 100 })
      .subscribe({
        next: (resposta) =>
          this.atividadesParaTroca.set((resposta.dados?.itens ?? []).map((item) => ({ id: item.id, rotulo: `${item.nome} · ${item.nomeDemanda}` }))),
        error: () => this.atividadesParaTroca.set([]),
      });
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
    if (atual.tipo === TipoPropostaIaEnum.CRIAR_ATIVIDADE || atual.tipo === TipoPropostaIaEnum.CRIAR_PROJETO || atual.tipo === TipoPropostaIaEnum.CRIAR_DEMANDA) {
      const ehProjeto = atual.tipo === TipoPropostaIaEnum.CRIAR_PROJETO;
      if (this.formularioAjuste.controls.nome.invalid || (ehProjeto && this.formularioAjuste.controls.codigo.invalid)) {
        this.formularioAjuste.controls.nome.markAsTouched();
        this.formularioAjuste.controls.codigo.markAsTouched();
        return;
      }
      dados['nome'] = valores.nome.trim();
      if (atual.tipo === TipoPropostaIaEnum.CRIAR_ATIVIDADE) dados['prioridade'] = valores.prioridade;
      if (ehProjeto) dados['codigo'] = valores.codigo.trim().toUpperCase();
    } else if (atual.tipo === TipoPropostaIaEnum.DESCREVER_DEMANDA) {
      // Só os campos que a proposta trouxe: um campo ausente não é alterado na demanda; esvaziar um que veio não é um ajuste válido.
      const cliente = valores.descricaoCliente.trim();
      const tecnica = valores.descricaoTecnica.trim();
      if ((this.texto('descricaoCliente') && !cliente) || (this.texto('descricaoTecnica') && !tecnica)) {
        this.formularioAjuste.controls.descricaoCliente.markAsTouched();
        this.formularioAjuste.controls.descricaoTecnica.markAsTouched();
        return;
      }
      if (this.texto('descricaoCliente')) dados['descricaoCliente'] = cliente;
      if (this.texto('descricaoTecnica')) dados['descricaoTecnica'] = tecnica;
    } else if (atual.tipo === TipoPropostaIaEnum.INICIAR_EXECUCAO) {
      dados['descricao'] = valores.descricao.trim();
    } else if (atual.tipo === TipoPropostaIaEnum.DESCREVER_EXECUCAO) {
      const descricao = valores.descricao.trim();
      if (descricao.length < 3) {
        this.formularioAjuste.controls.descricao.markAsTouched();
        return;
      }
      dados['descricao'] = descricao;
      const seguinte = this.atividadesParaTroca().find((item) => item.id === valores.atividadeSeguinteId);
      if (valores.atividadeSeguinteId) {
        dados['escolha'] = 'TROCAR';
        dados['atividadeSeguinteId'] = valores.atividadeSeguinteId;
        dados['atividadeSeguinteNome'] = seguinte?.rotulo.split(' · ')[0] ?? '';
        delete dados['descricaoSeguinte'];
      } else {
        dados['escolha'] = 'CONTINUAR';
        delete dados['atividadeSeguinteId'];
        delete dados['atividadeSeguinteNome'];
      }
    } else if (atual.tipo === TipoPropostaIaEnum.ANOTAR_PAD) {
      const campo = this.texto('operacao') === 'TROCAR' ? 'trechoNovo' : 'texto';
      dados[campo] = valores.descricao;
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
