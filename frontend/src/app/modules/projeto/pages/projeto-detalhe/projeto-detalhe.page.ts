import { Component, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
  ProjetoAlteradoDto,
  ProjetoRecuperadoDto,
  TipoProjetoStatusEnum,
  TipoDemandaStatusEnum,
  DemandaGrafoNoDto,
  TagResumoDto,
} from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { DemandaArvoreTelaComponent } from '../../../demanda/components/demanda-arvore-tela/demanda-arvore-tela.component';
import { DemandaArvorePainelComponent } from '../../../demanda/components/demanda-arvore-painel/demanda-arvore-painel.component';
import { DemandaFormularioDialogComponent } from '../../../demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaToolbarComponent } from '../../../demanda/components/demanda-toolbar/demanda-toolbar.component';
import { ProjetoFormularioDialogComponent } from '../../components/projeto-formulario-dialog/projeto-formulario-dialog.component';
import { ProjetoStatusChipComponent } from '../../components/projeto-status-chip/projeto-status-chip.component';
import { RelatorioExecucaoDialogComponent } from '../../../relatorio/components/relatorio-execucao-dialog/relatorio-execucao-dialog.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { PastaId, pastaInicial } from '../../../demanda/utils/demanda-pasta.util';
import {
  DemandaFiltro,
  FILTRO_VAZIO,
  contarPorStatus,
  filtroAtivo,
} from '../../../demanda/utils/demanda-filtro.util';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';

@Component({
  selector: 'app-projeto-detalhe',
  standalone: true,
  imports: [
    SkeletonListaComponent,
    ButtonModule,
    TooltipModule,
    DataBrasileiraPipe,
    TempoExibicaoPipe,
    DemandaArvorePainelComponent,
    DemandaArvoreTelaComponent,
    DemandaFormularioDialogComponent,
    DemandaToolbarComponent,
    ProjetoFormularioDialogComponent,
    ProjetoStatusChipComponent,
    RelatorioExecucaoDialogComponent,
  ],
  templateUrl: './projeto-detalhe.page.html',
  styleUrl: './projeto-detalhe.page.scss',
})
export class ProjetoDetalhePage implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  private readonly demandaService = inject(DemandaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly sessao = inject(UsuarioSessaoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  private readonly toolbar = viewChild<DemandaToolbarComponent>('toolbar');
  private readonly arvoreTela = viewChild<DemandaArvoreTelaComponent>('arvoreTela');
  private readonly editarDialog = viewChild.required(ProjetoFormularioDialogComponent);

  readonly projeto = signal<ProjetoRecuperadoDto | null>(null);
  /** Nós planos das demandas do projeto: a árvore, o resumo e os filtros saem daqui (cliente). */
  readonly nos = signal<DemandaGrafoNoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly carregandoDemandas = signal<boolean>(false);
  readonly mostrarDialogNovaDemanda = signal<boolean>(false);
  readonly filtro = signal<DemandaFiltro>(FILTRO_VAZIO);
  readonly filtroVazio = FILTRO_VAZIO;

  /** A pasta escolhida da Árvore (`null` é "Sem pasta"); o detalhe não a guarda na URL. */
  readonly pastaId = signal<PastaId>(null);
  readonly filtroEstaAtivo = computed(() => filtroAtivo(this.filtro()));
  readonly contagemPorStatus = computed(() => contarPorStatus(this.nos(), this.filtro()));

  readonly tagsDoProjeto = computed<TagResumoDto[]>(() => {
    const porId = new Map<number, TagResumoDto>();
    for (const no of this.nos()) for (const tag of no.tags ?? []) porId.set(tag.id, tag);
    return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  /** Resumo do projeto: executado e estimado somam todas as demandas (as estruturais costumam ter 0 estimado). */
  readonly resumo = computed(() => {
    const nos = this.nos();
    const minutosExecutados = nos.reduce((soma, no) => soma + no.minutosExecutados, 0);
    const horasEstimadas = nos.reduce((soma, no) => soma + no.horasEstimadas, 0);
    const percentual = horasEstimadas > 0 ? Math.round((minutosExecutados / (horasEstimadas * 60)) * 100) : 0;
    return { total: nos.length, minutosExecutados, horasEstimadas, percentual, estourou: percentual >= 100 };
  });

  ngOnInit(): void {
    const identificador = Number(this.route.snapshot.paramMap.get('id'));
    this.carregarProjeto(identificador);
    this.carregarArvore(identificador);
  }

  // ---------------------------------------------------------------------------
  // Atalhos: `/` busca, `E` expandir/recolher tudo
  // ---------------------------------------------------------------------------

  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta() || !this.nos().length) return;
    if (evento.key === '/') {
      evento.preventDefault();
      this.toolbar()?.focarBusca();
    } else if (evento.key.toLowerCase() === 'e') {
      evento.preventDefault();
      this.arvoreTela()?.alternarExpansaoGeral();
    }
  }

  get todosExpandidos(): boolean {
    return this.arvoreTela()?.todosExpandidos() ?? false;
  }

  aoAlterarFiltro(filtro: DemandaFiltro): void {
    this.filtro.set(filtro);
  }

  alternarExpansaoGeral(): void {
    this.arvoreTela()?.alternarExpansaoGeral();
  }

  // ---------------------------------------------------------------------------
  // Projeto: edição, status e visões
  // ---------------------------------------------------------------------------

  abrirDialogEditar(focarDatas = false): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.editarDialog().abrirEdicao(projetoDados, { focarDatas });
  }

  /** O DTO retornado traz os campos exibidos: aplica direto, sem novo GET nem spinner. */
  aoAlterarProjeto(alterado: ProjetoAlteradoDto): void {
    this.projeto.update((atual) => (atual ? { ...atual, ...alterado } : atual));
  }

  /** Status pela tag do cabeçalho: otimista, com rollback se a API recusar. */
  alterarStatus(status: TipoProjetoStatusEnum): void {
    const projetoDados = this.projeto();
    if (!projetoDados) return;
    const anterior = projetoDados.status;
    this.projeto.set({ ...projetoDados, status });
    this.projetoService.alterar(projetoDados.id, { status }).subscribe({
      error: () => this.projeto.update((atual) => (atual ? { ...atual, status: anterior } : atual)),
    });
  }

  /** Abre a visão escolhida (Grafo ou Controle de horas; a Árvore já está nesta tela) já com o projeto selecionado. */
  abrirVisao(modo: 'grafo' | 'controle-de-horas'): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.router.navigate(['/demanda'], { queryParams: { projetoId: projetoDados.id, modo } });
  }

  voltarParaListagem(): void {
    this.router.navigate(['/projeto']);
  }

  // ---------------------------------------------------------------------------
  // Demandas
  // ---------------------------------------------------------------------------

  /** Recarrega a árvore após criação/alteração feita pelo painel ou pela nova demanda raiz. */
  recarregarDemandas(): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.recarregarArvore(projetoDados.id);
    this.arvoreTela()?.recarregar();
  }

  /** Tags já gravadas pelo painel: troca no nó, sem recarregar (task 98). */
  aoTagsAlteradas(alteracao: { demandaId: number; tags: TagResumoDto[] }): void {
    this.nos.update((lista) => lista.map((no) => (no.id === alteracao.demandaId ? { ...no, tags: alteracao.tags } : no)));
  }

  /** Status trocado pelo chip da árvore (otimista, com rollback): aplica no nó sem recarregar. */
  aoStatusAlterado(alteracao: { demandaId: number; status: TipoDemandaStatusEnum }): void {
    this.nos.update((lista) => lista.map((no) => (no.id === alteracao.demandaId ? { ...no, status: alteracao.status } : no)));
  }

  private carregarProjeto(identificador: number): void {
    this.carregando.set(true);
    this.projetoService
      .recuperar(identificador)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.projeto.set(resposta.dados);
        },
      });
  }

  private carregarArvore(projetoId: number): void {
    this.carregandoDemandas.set(true);
    this.demandaService
      .recuperarGrafo(projetoId)
      .pipe(finalize(() => this.carregandoDemandas.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.nos.set(resposta.dados.nos);
            this.pastaId.set(pastaInicial(resposta.dados.nos, undefined));
          }
        },
      });
  }

  private recarregarArvore(projetoId: number): void {
    this.demandaService.recuperarGrafo(projetoId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.nos.set(resposta.dados.nos);
      },
    });
  }
}
