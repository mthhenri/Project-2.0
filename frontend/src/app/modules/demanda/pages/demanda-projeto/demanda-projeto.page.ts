import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { EditorModule } from 'primeng/editor';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  DemandaGrafoDto,
  DemandaGrafoNoDto,
  DemandaArvoreItemDto,
  DemandaAlterarDto,
  DemandaStatusEnum,
  DemandaCriadaDto,
  DemandaTagsAtribuirDto,
  TagResumoDto,
  ProjetoResumoDto,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { ProjetoService } from '../../../projeto/services/projeto.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DemandaGrafoComponent } from '../../components/demanda-grafo/demanda-grafo.component';
import { DemandaArvoreItemComponent } from '../../components/demanda-arvore-item/demanda-arvore-item.component';
import { DemandaFormularioDialogComponent } from '../../components/demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaDetalheDialogComponent } from '../../components/demanda-detalhe-dialog/demanda-detalhe-dialog.component';
import { DemandaEdicaoDialogComponent } from '../../components/demanda-edicao-dialog/demanda-edicao-dialog.component';
import { ModoVisualizacao } from '../../models/demanda.model';
import { COR_NO_BORDA } from '../../constants/demanda-cores.constants';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

@Component({
  selector: 'app-demanda-projeto',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    Select,
    EditorModule,
    TooltipModule,
    AssistenteDescricaoComponent,
    DemandaGrafoComponent,
    DemandaArvoreItemComponent,
    DemandaFormularioDialogComponent,
    DemandaDetalheDialogComponent,
    DemandaEdicaoDialogComponent,
  ],
  templateUrl: './demanda-projeto.page.html',
  styleUrl: './demanda-projeto.page.scss',
})
export class DemandaProjetoPage implements OnInit {
  private readonly demandaService = inject(DemandaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly tagService = inject(TagService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly projetos = signal<ProjetoResumoDto[]>([]);
  readonly projetoId = signal<number>(0);
  readonly projetoControle = new FormControl<number | null>(null);
  readonly grafo = signal<DemandaGrafoDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly carregandoProjetos = signal<boolean>(false);
  readonly modoVisualizacao = signal<ModoVisualizacao>('lista');
  readonly painelLateralAberto = signal<boolean>(true);
  readonly mostrarDialogNovaDemanda = signal<boolean>(false);
  readonly mostrarDialogDetalhe = signal<boolean>(false);
  readonly demandaIdSelecionada = signal<number>(0);
  readonly mostrarDialogEdicao = signal<boolean>(false);
  readonly demandaIdParaEditar = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);

  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly demandaIdTagsEditando = signal<number>(0);
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly carregandoSalvarTags = signal<boolean>(false);

  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

  readonly campoDescricaoEditando = signal<CampoDescricao | null>(null);
  readonly mostrarDialogDescricao = signal<boolean>(false);
  readonly carregandoSalvarDescricao = signal<boolean>(false);
  readonly demandaIdDescricaoEditando = signal<number>(0);
  readonly nomeDemandaDescricaoEditando = signal<string>('');

  readonly formularioDescricao = this.formBuilder.group({
    valor: ['' as string | null],
  });

  readonly legendaStatus = [
    { rotulo: 'Pendente',  cor: COR_NO_BORDA[DemandaStatusEnum.PENDENTE] },
    { rotulo: 'Planejada', cor: COR_NO_BORDA[DemandaStatusEnum.PLANEJADA] },
    { rotulo: 'Concluída', cor: COR_NO_BORDA[DemandaStatusEnum.CONCLUIDA] },
  ];

  readonly tituloDialogDescricao = computed(() => {
    const campo = this.campoDescricaoEditando();
    if (!campo) return '';
    const titulos: Record<CampoDescricao, string> = {
      descricaoTecnica: 'Descrição Técnica',
      descricaoCliente: 'Descrição para o Cliente',
      documentacao:     'Documentação',
    };
    return titulos[campo];
  });

  readonly arvoreRaizes = computed<DemandaArvoreItemDto[]>(() => {
    const grafoAtual = this.grafo();
    if (!grafoAtual?.nos?.length) return [];
    return this.construirArvore(grafoAtual.nos);
  });

  ngOnInit(): void {
    this.carregarProjetos();
    this.projetoControle.valueChanges.subscribe((valor) => {
      if (valor) this.selecionarProjeto(valor);
    });
  }

  selecionarProjeto(projetoId: number): void {
    this.projetoId.set(projetoId);
    this.router.navigate([], { queryParams: { projetoId }, replaceUrl: true });
    this.carregarGrafo();
  }

  alternarModo(modo: ModoVisualizacao): void {
    this.modoVisualizacao.set(modo);
  }

  alternarPainel(): void {
    this.painelLateralAberto.update((aberto) => !aberto);
  }

  abrirDetalhe(demandaId: number): void {
    this.demandaIdSelecionada.set(demandaId);
    this.mostrarDialogDetalhe.set(true);
  }

  abrirEdicao(demandaId: number): void {
    this.demandaIdParaEditar.set(demandaId);
    this.mostrarDialogEdicao.set(true);
  }

  abrirNovaFilha(demandaPaiId: number): void {
    this.demandaPaiIdNovaFilha.set(demandaPaiId);
    this.mostrarDialogNovaFilha.set(true);
  }

  abrirDialogTagsPorId(demandaId: number): void {
    this.demandaIdTagsEditando.set(demandaId);

    const carregarTagsDemanda = () => {
      this.demandaService.listarTags(demandaId).subscribe({
        next: (resposta) => {
          const tagIds = resposta.sucesso && resposta.dados ? resposta.dados.map((tag) => tag.id) : [];
          this.formularioTags.patchValue({ tagIds });
          this.mostrarDialogTags.set(true);
        },
      });
    };

    if (this.tagsDisponiveis().length > 0) {
      carregarTagsDemanda();
    } else {
      this.tagService.listar().subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.tagsDisponiveis.set(resposta.dados);
          }
          carregarTagsDemanda();
        },
      });
    }
  }

  salvarTags(): void {
    const idEditando = this.demandaIdTagsEditando();
    if (!idEditando) return;

    const dto: DemandaTagsAtribuirDto = {
      tagIds: this.formularioTags.value.tagIds ?? [],
    };

    this.carregandoSalvarTags.set(true);
    this.demandaService
      .alterarTags(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarTags.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
          this.mostrarDialogTags.set(false);
          this.recarregarGrafo();
        },
      });
  }

  toggleTag(tagId: number, evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    const tagIdsAtuais = [...(this.formularioTags.value.tagIds ?? [])];
    if (marcado) {
      if (!tagIdsAtuais.includes(tagId)) tagIdsAtuais.push(tagId);
    } else {
      const indice = tagIdsAtuais.indexOf(tagId);
      if (indice > -1) tagIdsAtuais.splice(indice, 1);
    }
    this.formularioTags.patchValue({ tagIds: tagIdsAtuais });
  }

  aoDemandaAlterada(): void {
    this.recarregarGrafo();
  }

  abrirDialogDescricaoPorId(demandaId: number, campo: CampoDescricao): void {
    this.demandaService.recuperar(demandaId).subscribe({
      next: (resposta) => {
        if (!resposta.sucesso || !resposta.dados) return;
        const demandaDados = resposta.dados;
        const valores: Record<CampoDescricao, string | null | undefined> = {
          descricaoTecnica: demandaDados.descricaoTecnica,
          descricaoCliente: demandaDados.descricaoCliente,
          documentacao:     demandaDados.documentacao,
        };
        this.demandaIdDescricaoEditando.set(demandaId);
        this.nomeDemandaDescricaoEditando.set(demandaDados.nome);
        this.campoDescricaoEditando.set(campo);
        this.formularioDescricao.patchValue({ valor: valores[campo] ?? '' });
        this.mostrarDialogDescricao.set(true);
      },
    });
  }

  salvarDescricao(): void {
    const campo = this.campoDescricaoEditando();
    const idEditando = this.demandaIdDescricaoEditando();
    if (!campo || !idEditando) return;

    this.carregandoSalvarDescricao.set(true);
    const dto = { [campo]: this.formularioDescricao.value.valor ?? undefined } as DemandaAlterarDto;

    this.demandaService
      .alterar(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarDescricao.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `${this.tituloDialogDescricao()} salva` });
          this.mostrarDialogDescricao.set(false);
        },
      });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formularioDescricao.patchValue({ valor: texto });
  }

  aoDemandaCriada(_demandaCriada: DemandaCriadaDto): void {
    this.recarregarGrafo();
  }

  aoDemandaExcluida(): void {
    this.recarregarGrafo();
  }

  projetoAtual(): ProjetoResumoDto | undefined {
    return this.projetos().find((p) => p.id === this.projetoId());
  }

  navegarParaProjeto(): void {
    if (this.projetoId()) {
      this.router.navigate(['/projeto', this.projetoId()]);
    } else {
      this.router.navigate(['/projeto']);
    }
  }

  rotuloStatus(status: DemandaStatusEnum): string {
    const mapa: Record<DemandaStatusEnum, string> = {
      [DemandaStatusEnum.PENDENTE]:  'Pendente',
      [DemandaStatusEnum.PLANEJADA]: 'Planejada',
      [DemandaStatusEnum.CONCLUIDA]: 'Concluída',
    };
    return mapa[status];
  }

  corStatus(status: DemandaStatusEnum): string {
    return COR_NO_BORDA[status];
  }

  private carregarProjetos(): void {
    this.carregandoProjetos.set(true);
    this.projetoService
      .listar({ itensPorPagina: 100 })
      .pipe(finalize(() => this.carregandoProjetos.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.projetos.set(resposta.dados.itens);
            const projetoIdParam = Number(this.route.snapshot.queryParamMap.get('projetoId'));
            if (projetoIdParam) {
              this.projetoControle.setValue(projetoIdParam, { emitEvent: false });
              this.projetoId.set(projetoIdParam);
              this.carregarGrafo();
            }
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os projetos' });
        },
      });
  }

  private recarregarGrafo(): void {
    this.demandaService
      .recuperarGrafo(this.projetoId())
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.grafo.set(resposta.dados);
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível atualizar o grafo' });
        },
      });
  }

  private carregarGrafo(): void {
    this.carregando.set(true);
    this.grafo.set(null);
    this.demandaService
      .recuperarGrafo(this.projetoId())
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.grafo.set(resposta.dados);
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar as demandas' });
        },
      });
  }

  private construirArvore(nos: DemandaGrafoNoDto[]): DemandaArvoreItemDto[] {
    const mapa = new Map<number, DemandaArvoreItemDto>();

    for (const no of nos) {
      mapa.set(no.id, {
        id:                  no.id,
        nome:                no.nome,
        status:              no.status,
        prioridade:          no.prioridade,
        isEstrutural:        no.isEstrutural,
        horasEstimadas:      no.horasEstimadas,
        temDescricaoTecnica: no.temDescricaoTecnica,
        temDescricaoCliente: no.temDescricaoCliente,
        temDocumentacao:     no.temDocumentacao,
        tags:                no.tags ?? [],
        nivel:               0,
        filhos:              [],
      });
    }

    const raizes: DemandaArvoreItemDto[] = [];
    for (const no of nos) {
      const item = mapa.get(no.id)!;
      if (no.demandaPaiId && mapa.has(no.demandaPaiId)) {
        mapa.get(no.demandaPaiId)!.filhos.push(item);
      } else {
        raizes.push(item);
      }
    }

    return raizes;
  }
}
