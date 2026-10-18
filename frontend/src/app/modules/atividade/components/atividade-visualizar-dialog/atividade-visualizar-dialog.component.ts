import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  AtividadeRecuperadaDto,
  AtividadeResumoDto,
  TipoAtividadeStatusEnum,
  AtividadeAlterarDto,
  TagResumoDto,
  ExecucaoItemDto,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { ATIVIDADE_STATUS_EXECUTAVEL, ATIVIDADE_STATUS_OPCOES, severidadeStatusAtividade, rotuloStatusAtividade } from '../../models/atividade.model';
import { TagService } from '../../../tag/services/tag.service';
import { AtividadeTagsPopoverComponent } from '../atividade-tags-popover/atividade-tags-popover.component';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';

@Component({
  selector: 'app-atividade-visualizar-dialog',
  standalone: true,
  imports: [
    AtividadeTagsPopoverComponent,
    PrioridadeSeloComponent,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    Tag,
    TooltipModule,
    DataBrasileiraPipe,
    MinutosParaHorasPipe,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './atividade-visualizar-dialog.component.html',
  styleUrl: './atividade-visualizar-dialog.component.scss',
})
export class AtividadeVisualizarDialogComponent {
  private readonly atividadeService = inject(AtividadeService);
  private readonly tagService = inject(TagService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly mostrarDialog = signal<boolean>(false);
  readonly carregandoVisualizar = signal<boolean>(false);
  readonly atividadeVisualizada = signal<AtividadeRecuperadaDto | null>(null);
  readonly tagsVisualizar = signal<TagResumoDto[]>([]);
  readonly execucoesVisualizar = signal<ExecucaoItemDto[]>([]);
  readonly editandoNome = signal<boolean>(false);
  readonly salvandoNome = signal<boolean>(false);

  readonly severidadeStatus = severidadeStatusAtividade;
  readonly rotuloStatus = rotuloStatusAtividade;

  readonly aoAlterar = output<void>();
  /** Pede à tela que abra o dialog de iniciar/encerrar da atividade (só quando a tela passou o resumo). */
  readonly alternarExecucao = output<AtividadeResumoDto>();

  /** O resumo da linha que abriu o dialog (contexto, tempo total, estado da execução); sem ele o dialog só lê. */
  readonly resumo = signal<AtividadeResumoDto | null>(null);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;

  private readonly tagsPopover = viewChild(AtividadeTagsPopoverComponent);

  /** Gestor, ou o dono da atividade: quem pode mexer em status, tags e execução. */
  readonly podeEditar = computed(() => {
    const atividade = this.atividadeVisualizada();
    return !!atividade && (this.sessao.eGestor() || atividade.usuarioId === this.sessao.id());
  });
  readonly emExecucao = computed(() => this.resumo()?.execucaoAtivaId != null);
  /** O status só muda sem execução em andamento. */
  readonly podeTrocarStatus = computed(() => !!this.resumo() && this.podeEditar() && !this.emExecucao());
  readonly podeIniciar = computed(() => {
    const atividade = this.atividadeVisualizada();
    return !!atividade && ATIVIDADE_STATUS_EXECUTAVEL.includes(atividade.status);
  });

  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');

  readonly formularioNome = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
  });

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  /** Abre o dialog e carrega atividade, tags e execuções. `resumo` (da linha clicada) liga contexto e ações de execução. */
  abrir(atividadeId: number, resumo: AtividadeResumoDto | null = null): void {
    this.resumo.set(resumo);
    this.carregandoVisualizar.set(true);
    this.atividadeVisualizada.set(null);
    this.tagsVisualizar.set([]);
    this.execucoesVisualizar.set([]);
    this.editandoNome.set(false);
    this.mostrarDialog.set(true);

    forkJoin({
      atividade:  this.atividadeService.recuperar(atividadeId),
      tags:       this.atividadeService.listarTags(atividadeId),
      execucoes:  this.atividadeService.listarExecucoesPorAtividade(atividadeId),
    })
      .pipe(finalize(() => this.carregandoVisualizar.set(false)))
      .subscribe({
        next: ({ atividade, tags, execucoes }) => {
          if (atividade.sucesso && atividade.dados) {
            this.atividadeVisualizada.set(atividade.dados);
          }
          if (tags.sucesso && tags.dados)           this.tagsVisualizar.set(tags.dados);
          if (execucoes.sucesso && execucoes.dados) this.execucoesVisualizar.set(execucoes.dados.itens);
        },
      });
  }

  /** A tela recarregou a lista (ex.: depois de iniciar/encerrar): atualiza o resumo e as execuções do dialog aberto. */
  sincronizar(lista: AtividadeResumoDto[]): void {
    const atual = this.resumo();
    if (!this.mostrarDialog() || !atual) return;
    const atualizado = lista.find((item) => item.id === atual.id);
    if (atualizado) this.resumo.set(atualizado);
    this.atividadeService.listarExecucoesPorAtividade(atual.id).subscribe((resposta) => {
      if (resposta.sucesso && resposta.dados) this.execucoesVisualizar.set(resposta.dados.itens);
    });
  }

  /** Troca o status sem sair do dialog; se a API recusar (o interceptor avisa), volta ao anterior. */
  alterarStatus(status: TipoAtividadeStatusEnum | null): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade || !status || status === atividade.status || !this.podeTrocarStatus()) return;
    const anterior = atividade.status;
    this.definirStatus(status);
    this.atividadeService.alterar(atividade.id, { status }).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
        this.aoAlterar.emit();
      },
      error: () => this.definirStatus(anterior),
    });
  }

  private definirStatus(status: TipoAtividadeStatusEnum): void {
    this.atividadeVisualizada.update((atual) => (atual ? { ...atual, status } : atual));
    this.resumo.update((atual) => (atual ? { ...atual, status } : atual));
  }

  abrirTags(evento: Event, alvo: HTMLElement): void {
    if (!this.podeEditar()) return;
    if (this.todasAsTags().length === 0) {
      this.tagService.listar().subscribe((resposta) => {
        if (resposta.sucesso && resposta.dados) this.todasAsTags.set(resposta.dados);
      });
    }
    this.tagsPopover()?.abrir(evento, alvo, this.tagsVisualizar().map((tag) => tag.id));
  }

  salvarTags(tagIds: number[]): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade) return;
    this.atividadeService.alterarTags(atividade.id, { tagIds }).subscribe((resposta) => {
      if (!resposta.sucesso || !resposta.dados) return;
      this.tagsVisualizar.set(resposta.dados.tags);
      this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
      this.aoAlterar.emit();
    });
  }

  /** Entra no modo de edição do nome (só gestor), preenchendo o form com o nome atual. */
  iniciarEdicaoNome(): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade) return;
    this.formularioNome.reset({ nome: atividade.nome });
    this.editandoNome.set(true);
    setTimeout(() => this.campoNome()?.nativeElement.focus());
  }

  /** Sai do modo de edição sem salvar. */
  cancelarEdicaoNome(): void {
    this.editandoNome.set(false);
  }

  /** Salva o novo nome (gestor). Atualiza o header, emite aoAlterar, fecha o modo de edição. */
  salvarNome(): void {
    const atividade = this.atividadeVisualizada();
    if (!atividade || this.formularioNome.invalid) return;

    const nome = (this.formularioNome.value.nome ?? '').trim();
    this.salvandoNome.set(true);
    const dto: AtividadeAlterarDto = { nome };
    this.atividadeService
      .alterar(atividade.id, dto)
      .pipe(finalize(() => this.salvandoNome.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const alterada = resposta.dados;
            this.atividadeVisualizada.update((atual) => (atual ? { ...atual, nome: alterada.nome } : atual));
            this.editandoNome.set(false);
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Nome alterado' });
            this.aoAlterar.emit();
          }
        },
      });
  }

  iniciais(nome: string): string {
    return (nome ?? '')
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }
}
