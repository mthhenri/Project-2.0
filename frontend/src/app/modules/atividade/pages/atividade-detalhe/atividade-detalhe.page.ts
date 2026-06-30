import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextareaModule } from 'primeng/textarea';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  AtividadeRecuperadaDto,
  AtividadeStatusEnum,
  AtividadeAlterarDto,
  AtividadeTagsAtribuirDto,
  TagResumoDto,
  ExecucaoIniciarDto,
  ExecucaoIniciadaDto,
  ExecucaoItemDto,
  StandardResponse,
  PaginatedResult,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { ambiente } from '../../../../../environments/environment';
import {
  ATIVIDADE_STATUS_OPCOES,
  severidadeStatusAtividade,
  rotuloStatusAtividade,
} from '../../models/atividade.model';

@Component({
  selector: 'app-atividade-detalhe',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    Select,
    MultiSelectModule,
    TextareaModule,
    Tag,
    TooltipModule,
    AssistenteDescricaoComponent,
    DataBrasileiraPipe,
  ],
  templateUrl: './atividade-detalhe.page.html',
  styleUrl: './atividade-detalhe.page.scss',
})
export class AtividadeDetalhePage implements OnInit {
  private readonly atividadeService = inject(AtividadeService);
  private readonly tagService = inject(TagService);
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly atividadeId = signal<number>(0);
  readonly atividade = signal<AtividadeRecuperadaDto | null>(null);
  readonly tagsDaAtividade = signal<TagResumoDto[]>([]);
  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly execucoesRecentes = signal<ExecucaoItemDto[]>([]);
  readonly carregando = signal<boolean>(false);

  readonly mostrarDialogDescricao = signal<boolean>(false);
  readonly carregandoDescricao = signal<boolean>(false);
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly carregandoTags = signal<boolean>(false);
  readonly mostrarDialogExecucao = signal<boolean>(false);
  readonly carregandoExecucao = signal<boolean>(false);

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  readonly severidadeStatus = severidadeStatusAtividade;
  readonly rotuloStatus = rotuloStatusAtividade;

  readonly formularioStatus = this.formBuilder.group({
    status: [AtividadeStatusEnum.PLANEJADA as AtividadeStatusEnum],
  });

  readonly formularioDescricao = this.formBuilder.group({
    descricao: [''],
  });

  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

  readonly formularioExecucao = this.formBuilder.group({
    descricao: ['', [Validators.required]],
  });

  readonly iniciais = computed(() => {
    const nome = this.atividade()?.nomeUsuario ?? '';
    return nome.split(' ').slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
  });

  ngOnInit(): void {
    const id = Number(this.rotaAtiva.snapshot.paramMap.get('id'));
    this.atividadeId.set(id);
    this.carregarTudo(id);
  }

  alterarStatus(): void {
    const atividade = this.atividade();
    const novoStatus = this.formularioStatus.value.status;
    if (!atividade || !novoStatus || novoStatus === atividade.status) return;

    const dto: AtividadeAlterarDto = { status: novoStatus };
    this.atividadeService.alterar(atividade.id, dto).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          const alterada = resposta.dados;
          this.atividade.update((atual) => (atual ? { ...atual, status: alterada.status } : atual));
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status atualizado' });
        }
      },
    });
  }

  abrirDialogDescricao(): void {
    this.formularioDescricao.patchValue({ descricao: this.atividade()?.descricao ?? '' });
    this.mostrarDialogDescricao.set(true);
  }

  salvarDescricao(): void {
    const atividade = this.atividade();
    if (!atividade) return;

    this.carregandoDescricao.set(true);
    const dto: AtividadeAlterarDto = { descricao: this.formularioDescricao.value.descricao ?? '' };
    this.atividadeService
      .alterar(atividade.id, dto)
      .pipe(finalize(() => this.carregandoDescricao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const alterada = resposta.dados;
            this.atividade.update((atual) => (atual ? { ...atual, descricao: alterada.descricao } : atual));
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Descrição salva' });
            this.mostrarDialogDescricao.set(false);
          }
        },
      });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formularioDescricao.patchValue({ descricao: texto });
  }

  abrirDialogTags(): void {
    this.formularioTags.patchValue({ tagIds: this.tagsDaAtividade().map((tag) => tag.id) });
    this.mostrarDialogTags.set(true);
  }

  salvarTags(): void {
    const atividade = this.atividade();
    if (!atividade) return;

    this.carregandoTags.set(true);
    const dto: AtividadeTagsAtribuirDto = { tagIds: this.formularioTags.value.tagIds ?? [] };
    this.atividadeService
      .alterarTags(atividade.id, dto)
      .pipe(finalize(() => this.carregandoTags.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
          this.mostrarDialogTags.set(false);
          this.carregarTags(atividade.id);
        },
      });
  }

  abrirDialogExecucao(): void {
    this.formularioExecucao.reset({ descricao: '' });
    this.mostrarDialogExecucao.set(true);
  }

  iniciarExecucao(): void {
    const atividade = this.atividade();
    if (!atividade || this.formularioExecucao.invalid) {
      this.formularioExecucao.markAllAsTouched();
      return;
    }

    this.carregandoExecucao.set(true);
    const dto: ExecucaoIniciarDto = {
      atividadeId: atividade.id,
      descricao:   this.formularioExecucao.value.descricao!,
    };

    this.httpClient
      .post<StandardResponse<ExecucaoIniciadaDto>>(`${ambiente.apiUrl}/execucao`, dto)
      .pipe(finalize(() => this.carregandoExecucao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso) {
            this.mostrarDialogExecucao.set(false);
            this.router.navigate(['/execucao']);
          }
        },
      });
  }

  irParaHistorico(): void {
    this.router.navigate(['/execucao'], { queryParams: { atividadeId: this.atividadeId() } });
  }

  voltar(): void {
    const demandaId = this.atividade()?.demandaId;
    this.router.navigate(['/atividade'], { queryParams: demandaId ? { demandaId } : {} });
  }

  private carregarTudo(id: number): void {
    this.carregando.set(true);
    forkJoin({
      atividade: this.atividadeService.recuperar(id),
      tags:      this.atividadeService.listarTags(id),
      todasTags: this.tagService.listar(),
      execucoes: this.httpClient.get<StandardResponse<PaginatedResult<ExecucaoItemDto>>>(
        `${ambiente.apiUrl}/execucao`,
        { params: { atividadeId: String(id), itensPorPagina: '5' } },
      ),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ atividade, tags, todasTags, execucoes }) => {
          if (atividade.sucesso && atividade.dados) {
            this.atividade.set(atividade.dados);
            this.formularioStatus.patchValue({ status: atividade.dados.status }, { emitEvent: false });
          }
          if (tags.sucesso && tags.dados) this.tagsDaAtividade.set(tags.dados);
          if (todasTags.sucesso && todasTags.dados) this.tagsDisponiveis.set(todasTags.dados);
          if (execucoes.sucesso && execucoes.dados) this.execucoesRecentes.set(execucoes.dados.itens);
        },
      });
  }

  private carregarTags(id: number): void {
    this.atividadeService.listarTags(id).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.tagsDaAtividade.set(resposta.dados);
      },
    });
  }
}
