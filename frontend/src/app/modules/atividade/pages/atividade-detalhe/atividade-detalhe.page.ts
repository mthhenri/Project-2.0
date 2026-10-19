import { Component, DestroyRef, HostListener, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  AtividadeRecuperadaDto,
  TipoAtividadePrioridadeEnum,
  TipoAtividadeStatusEnum,
  TagResumoDto,
  ExecucaoItemDto,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
  temPermissaoDeGestor,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { ExecucaoTimerComponent } from '../../../execucao/components/execucao-timer/execucao-timer.component';
import { AtividadeTagsPopoverComponent } from '../../components/atividade-tags-popover/atividade-tags-popover.component';
import { ExecucaoRegistroDialogComponent } from '../../components/execucao-registro-dialog/execucao-registro-dialog.component';
import { ATIVIDADE_STATUS_OPCOES, severidadeStatusAtividade, rotuloStatusAtividade } from '../../models/atividade.model';
import { estadoDaFaixaDeExecucao, formatarIntervaloDaExecucao } from '../../utils/faixa-execucao.util';

/** Quantas execuções o detalhe mostra; o histórico completo fica na tela de Execuções. */
const EXECUCOES_RECENTES = 5;

/**
 * Detalhe da atividade: a tela de trabalho. A faixa de execução concentra iniciar, pausar e trocar de atividade sem sair daqui;
 * as regras de quem pode o quê são as mesmas da listagem (gestor ou dono; só Planejada/Desenvolvendo inicia; status travado
 * enquanto há execução).
 */
@Component({
  selector: 'app-atividade-detalhe',
  standalone: true,
  imports: [
    PrioridadeSeloComponent,
    AtividadeTagsPopoverComponent,
    ExecucaoRegistroDialogComponent,
    ExecucaoTimerComponent,
    SkeletonListaComponent,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    Select,
    Tag,
    TooltipModule,
    DataBrasileiraPipe,
    MinutosParaHorasPipe,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './atividade-detalhe.page.html',
  styleUrl: './atividade-detalhe.page.scss',
})
export class AtividadeDetalhePage implements OnInit {
  private readonly atividadeService = inject(AtividadeService);
  private readonly tagService = inject(TagService);
  private readonly router = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly sessao = inject(UsuarioSessaoService);
  protected readonly execucaoAtiva = inject(ExecucaoAtivaService);
  protected readonly prioridadeService = inject(AtividadePrioridadeService);

  private readonly tagsPopover = viewChild.required<AtividadeTagsPopoverComponent>('tagsPopover');
  private readonly registroDialog = viewChild.required<ExecucaoRegistroDialogComponent>('registroDialog');

  readonly atividadeId = signal<number>(0);
  readonly atividade = signal<AtividadeRecuperadaDto | null>(null);
  readonly tagsDaAtividade = signal<TagResumoDto[]>([]);
  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly execucoesRecentes = signal<ExecucaoItemDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly jaCarregou = signal<boolean>(false);
  readonly executando = signal<boolean>(false);

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  readonly severidadeStatus = severidadeStatusAtividade;
  readonly rotuloStatus = rotuloStatusAtividade;
  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  readonly intervaloDaExecucao = formatarIntervaloDaExecucao;

  readonly formularioStatus = this.formBuilder.group({
    status: [TipoAtividadeStatusEnum.PLANEJADA as TipoAtividadeStatusEnum],
    prioridade: [TipoAtividadePrioridadeEnum.INDEFINIDA as TipoAtividadePrioridadeEnum],
  });

  /** "O que você vai fazer?" da faixa de início rápido; a obrigatoriedade depende do dono (ver `descricaoObrigatoria`). */
  readonly descricaoInicio = new FormControl<string>('', { nonNullable: true, validators: [Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)] });

  readonly iniciais = computed(() => this.iniciaisDe(this.atividade()?.nomeUsuario ?? ''));

  iniciaisDe(nome: string): string {
    return nome.split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  }

  /** Gestor, ou o dono da atividade: quem pode iniciar, pausar, trocar status e mexer nas tags. */
  readonly podeAgir = computed(() => {
    const atividade = this.atividade();
    return !!atividade && (this.sessao.eGestor() || atividade.usuarioId === this.sessao.id());
  });

  readonly execucaoAberta = computed(() => this.execucoesRecentes().find((execucao) => execucao.fimData === null) ?? null);

  /** A execução aberta nesta atividade é a do usuário logado (o timer e a pausa usam a execução ativa compartilhada). */
  readonly execucaoAbertaEhMinha = computed(() => {
    const aberta = this.execucaoAberta();
    return !!aberta && this.execucaoAtiva.ativa()?.id === aberta.id;
  });

  /** A execução ativa do usuário logado, quando é em **outra** atividade e a atividade daqui também é dele (a trava vale para o dono). */
  readonly minhaExecucaoEmOutra = computed(() => {
    const ativa = this.execucaoAtiva.ativa();
    const atividade = this.atividade();
    if (!ativa || !atividade || ativa.atividadeId === atividade.id) return null;
    return atividade.usuarioId === this.sessao.id() ? ativa : null;
  });

  readonly estadoFaixa = computed(() => {
    const atividade = this.atividade();
    if (!atividade) return 'oculta' as const;
    return estadoDaFaixaDeExecucao({
      podeAgir: this.podeAgir(),
      status: atividade.status,
      execucaoAbertaNestaAtividade: !!this.execucaoAberta(),
      donoExecutandoOutra: !!this.minhaExecucaoEmOutra(),
    });
  });

  /** O status só muda sem execução em andamento. */
  readonly statusBloqueado = computed(() => !!this.execucaoAberta() || !this.podeAgir());

  /** A descrição da execução é opcional quando o dono é gestor. */
  readonly descricaoObrigatoria = computed(() => {
    const tipo = this.atividade()?.usuarioTipo;
    return !tipo || !temPermissaoDeGestor(tipo);
  });

  /** A última descrição já usada nesta atividade, oferecida como atalho ("↩ Reutilizar última"). */
  readonly ultimaDescricao = computed(() => this.execucoesRecentes().find((execucao) => execucao.fimData !== null && !!execucao.descricao)?.descricao ?? null);

  constructor() {
    effect(() => {
      const controle = this.formularioStatus.controls.status;
      if (this.statusBloqueado()) controle.disable({ emitEvent: false });
      else controle.enable({ emitEvent: false });
    });
    // A pausa pelo chip da topbar encerra a execução fora desta tela: recarrega as execuções para a faixa acompanhar.
    effect(() => {
      this.execucaoAtiva.pausasDoChip();
      untracked(() => {
        if (this.jaCarregou()) this.carregarExecucoes();
      });
    });
  }

  ngOnInit(): void {
    this.prioridadeService.carregar();
    this.rotaAtiva.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      const id = Number(parametros.get('id'));
      this.atividadeId.set(id);
      // Rota com id que não é número (ex.: /atividade/nova): "não encontrada" direto, sem chamar a API.
      if (!Number.isInteger(id) || id <= 0) {
        this.atividade.set(null);
        this.jaCarregou.set(true);
        return;
      }
      this.carregarTudo(id);
    });
  }

  /** Ao voltar para a aba, as execuções podem ter mudado (outro dispositivo, encerramento automático às 23:59). */
  @HostListener('document:visibilitychange')
  aoMudarVisibilidade(): void {
    if (document.visibilityState === 'visible' && this.jaCarregou()) {
      this.execucaoAtiva.carregar();
      this.carregarExecucoes();
    }
  }

  // --- Status e prioridade ---

  alterarStatus(): void {
    const atividade = this.atividade();
    const novoStatus = this.formularioStatus.controls.status.value;
    if (!atividade || !novoStatus || novoStatus === atividade.status) return;

    const statusAnterior = atividade.status;
    this.atividade.update((atual) => (atual ? { ...atual, status: novoStatus } : atual));
    this.atividadeService.alterar(atividade.id, { status: novoStatus }).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status atualizado' }),
      error: () => {
        this.atividade.update((atual) => (atual ? { ...atual, status: statusAnterior } : atual));
        this.formularioStatus.patchValue({ status: statusAnterior }, { emitEvent: false });
      },
    });
  }

  alterarPrioridade(): void {
    const atividade = this.atividade();
    const novaPrioridade = this.formularioStatus.value.prioridade;
    if (!atividade || !novaPrioridade || novaPrioridade === atividade.prioridade.codigo) return;

    this.atividadeService.alterar(atividade.id, { prioridade: novaPrioridade }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          const alterada = resposta.dados;
          this.atividade.update((atual) => (atual ? { ...atual, prioridade: alterada.prioridade } : atual));
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Prioridade atualizada' });
        }
      },
      error: () => this.formularioStatus.patchValue({ prioridade: atividade.prioridade.codigo }, { emitEvent: false }),
    });
  }

  // --- Tags (popover de chips, salva ao fechar) ---

  abrirTags(evento: Event, alvo: HTMLElement): void {
    if (!this.podeAgir()) return;
    this.tagsPopover().abrir(evento, alvo, this.tagsDaAtividade().map((tag) => tag.id));
  }

  salvarTags(tagIds: number[]): void {
    const atividade = this.atividade();
    if (!atividade) return;
    const anteriores = this.tagsDaAtividade();
    this.tagsDaAtividade.set(this.tagsDisponiveis().filter((tag) => tagIds.includes(tag.id)));
    this.atividadeService.alterarTags(atividade.id, { tagIds }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.tagsDaAtividade.set(resposta.dados.tags);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
      },
      error: () => this.tagsDaAtividade.set(anteriores),
    });
  }

  // --- Execução: iniciar, pausar, trocar ---

  reutilizarUltimaDescricao(): void {
    const ultima = this.ultimaDescricao();
    if (ultima) this.descricaoInicio.setValue(ultima);
  }

  /** Início rápido: Enter no campo. Fica na página — a faixa vira "ativa" e a nova execução aparece na lista. */
  iniciarExecucao(): void {
    const atividade = this.atividade();
    const descricao = this.descricaoInicio.value.trim();
    if (!atividade || this.executando()) return;
    if (this.descricaoInicio.invalid || (this.descricaoObrigatoria() && !descricao)) {
      this.descricaoInicio.markAsTouched();
      return;
    }
    this.executando.set(true);
    this.atividadeService
      .iniciarExecucao({ atividadeId: atividade.id, descricao })
      .pipe(finalize(() => this.executando.set(false)))
      .subscribe({ next: (resposta) => this.aposMudarExecucao(resposta.sucesso, 'Execução iniciada') });
  }

  /** Pausa em 1 clique mantendo a descrição da execução. */
  pausarExecucao(execucao: ExecucaoItemDto): void {
    if (this.executando()) return;
    this.executando.set(true);
    this.atividadeService
      .encerrarExecucao(execucao.id, { descricao: execucao.descricao })
      .pipe(finalize(() => this.executando.set(false)))
      .subscribe({ next: (resposta) => this.aposMudarExecucao(resposta.sucesso, 'Execução pausada') });
  }

  /** Encadeia encerrar a execução do dono em outra atividade e iniciar aqui. Se o encerramento falhar, nada é iniciado. */
  pausarLaEIniciarAqui(): void {
    const atividade = this.atividade();
    const outra = this.minhaExecucaoEmOutra();
    const descricao = this.descricaoInicio.value.trim();
    if (!atividade || !outra || this.executando()) return;
    if (this.descricaoInicio.invalid || (this.descricaoObrigatoria() && !descricao)) {
      this.descricaoInicio.markAsTouched();
      return;
    }
    this.executando.set(true);
    this.atividadeService.encerrarExecucao(outra.id, { descricao: outra.descricao }).subscribe({
      next: (encerrada) => {
        if (!encerrada.sucesso) return this.executando.set(false);
        this.atividadeService
          .iniciarExecucao({ atividadeId: atividade.id, descricao })
          .pipe(finalize(() => this.executando.set(false)))
          .subscribe({ next: (resposta) => this.aposMudarExecucao(resposta.sucesso, 'Execução trocada para esta atividade') });
      },
      error: () => this.executando.set(false),
    });
  }

  abrirRegistro(): void {
    const atividade = this.atividade();
    if (atividade) this.registroDialog().abrir(atividade);
  }

  aoRegistrarTempo(): void {
    this.carregarExecucoes();
  }

  private aposMudarExecucao(sucesso: boolean, mensagem: string): void {
    if (!sucesso) return;
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: mensagem });
    this.descricaoInicio.reset('');
    this.carregarExecucoes();
  }

  // --- Navegação ---

  irParaHistorico(): void {
    this.router.navigate(['/execucao'], { queryParams: { atividadeId: this.atividadeId() } });
  }

  /** Volta para a lista de atividades da demanda desta atividade. */
  verAtividadesDaDemanda(): void {
    const demandaId = this.atividade()?.demandaId;
    this.router.navigate(['/atividade'], { queryParams: demandaId ? { demandaId } : {} });
  }

  // --- Carga ---

  private carregarTudo(id: number): void {
    this.carregando.set(true);
    this.execucaoAtiva.carregar();
    forkJoin({
      atividade: this.atividadeService.recuperar(id),
      tags:      this.atividadeService.listarTags(id),
      todasTags: this.tagService.listar(),
      execucoes: this.atividadeService.listarExecucoesPorAtividade(id),
    })
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: ({ atividade, tags, todasTags, execucoes }) => {
          if (atividade.sucesso && atividade.dados) {
            this.atividade.set(atividade.dados);
            this.formularioStatus.patchValue({ status: atividade.dados.status, prioridade: atividade.dados.prioridade.codigo }, { emitEvent: false });
          }
          if (tags.sucesso && tags.dados) this.tagsDaAtividade.set(tags.dados);
          if (todasTags.sucesso && todasTags.dados) this.tagsDisponiveis.set(todasTags.dados);
          if (execucoes.sucesso && execucoes.dados) this.execucoesRecentes.set(execucoes.dados.itens.slice(0, EXECUCOES_RECENTES));
        },
      });
  }

  /** Recarrega as execuções recentes e a atividade (o status pode ter mudado com a execução). */
  private carregarExecucoes(): void {
    const id = this.atividadeId();
    if (!id) return;
    forkJoin({
      atividade: this.atividadeService.recuperar(id),
      execucoes: this.atividadeService.listarExecucoesPorAtividade(id),
    }).subscribe({
      next: ({ atividade, execucoes }) => {
        if (atividade.sucesso && atividade.dados) {
          this.atividade.set(atividade.dados);
          this.formularioStatus.patchValue({ status: atividade.dados.status }, { emitEvent: false });
        }
        if (execucoes.sucesso && execucoes.dados) this.execucoesRecentes.set(execucoes.dados.itens.slice(0, EXECUCOES_RECENTES));
      },
    });
  }
}
