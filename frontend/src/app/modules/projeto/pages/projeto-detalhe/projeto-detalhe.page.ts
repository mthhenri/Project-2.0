import { Component, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import {
  ProjetoAlterarDto,
  ProjetoRecuperadoDto,
  TipoDemandaStatusEnum,
  DemandaGrafoNoDto,
  TagResumoDto,
} from '@project20/shared';
import { ProjetoService } from '../../services/projeto.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { DemandaArvoreTelaComponent } from '../../../demanda/components/demanda-arvore-tela/demanda-arvore-tela.component';
import { DemandaArvorePainelComponent } from '../../../demanda/components/demanda-arvore-painel/demanda-arvore-painel.component';
import { DemandaFormularioDialogComponent } from '../../../demanda/components/demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaToolbarComponent } from '../../../demanda/components/demanda-toolbar/demanda-toolbar.component';
import { ProjetoCampoEditavelComponent } from '../../components/projeto-campo-editavel/projeto-campo-editavel.component';
import { ProjetoVolumeComponent } from '../../components/projeto-volume/projeto-volume.component';
import { ProjetoVolumeDialogComponent } from '../../components/projeto-volume-dialog/projeto-volume-dialog.component';
import { ProjetoStatusChipComponent } from '../../components/projeto-status-chip/projeto-status-chip.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { PastaId, pastaInicial } from '../../../demanda/utils/demanda-pasta.util';
import {
  DemandaFiltro,
  FILTRO_VAZIO,
  contarPorStatus,
  filtroAtivo,
} from '../../../demanda/utils/demanda-filtro.util';
import { corTextoSobre, siglaDoProjeto } from '../../utils/projeto-identidade.util';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';

const CHAVE_VOLUME_RECOLHIDO = 'projeto.volume.recolhido';

@Component({
  selector: 'app-projeto-detalhe',
  standalone: true,
  imports: [
    SkeletonListaComponent,
    ButtonModule,
    TooltipModule,
    DataBrasileiraPipe,
    DemandaArvorePainelComponent,
    DemandaArvoreTelaComponent,
    DemandaFormularioDialogComponent,
    DemandaToolbarComponent,
    ProjetoCampoEditavelComponent,
    ProjetoVolumeComponent,
    ProjetoVolumeDialogComponent,
    ProjetoStatusChipComponent,
  ],
  templateUrl: './projeto-detalhe.page.html',
  styleUrl: './projeto-detalhe.page.scss',
})
export class ProjetoDetalhePage implements OnInit {
  private readonly projetoService = inject(ProjetoService);
  private readonly demandaService = inject(DemandaService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  readonly sessao = inject(UsuarioSessaoService);

  private readonly toolbar = viewChild<DemandaToolbarComponent>('toolbar');
  private readonly arvoreTela = viewChild<DemandaArvoreTelaComponent>('arvoreTela');

  readonly projeto = signal<ProjetoRecuperadoDto | null>(null);
  /** Selo do cabeçalho: sigla do nome e texto legível sobre a cor do projeto. */
  readonly siglaDoSelo = computed(() => siglaDoProjeto(this.projeto()?.nome ?? ''));
  readonly corTextoSelo = computed(() => corTextoSobre(this.projeto()?.cor ?? ''));
  /** Nós planos das demandas do projeto: a árvore, o resumo e os filtros saem daqui (cliente). */
  readonly nos = signal<DemandaGrafoNoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly carregandoDemandas = signal<boolean>(false);
  /** A carga das demandas falhou: o detalhe oferece "Tentar de novo" em vez de dizer que o projeto não tem demandas (P-058). */
  readonly erroAoCarregarDemandas = signal<boolean>(false);
  readonly mostrarDialogNovaDemanda = signal<boolean>(false);
  /** A seção "Volume" (gestor) recolhida; fica lembrada neste navegador (task 290). */
  readonly volumeRecolhido = signal<boolean>(this.lerVolumeRecolhido());
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

  alternarVolume(): void {
    this.volumeRecolhido.update((atual) => !atual);
    try {
      localStorage.setItem(CHAVE_VOLUME_RECOLHIDO, String(this.volumeRecolhido()));
    } catch {
      // Sem armazenamento (janela privada, dados bloqueados): vale só até sair da tela.
    }
  }

  private lerVolumeRecolhido(): boolean {
    try {
      return localStorage.getItem(CHAVE_VOLUME_RECOLHIDO) === 'true';
    } catch {
      return false;
    }
  }

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

  /**
   * Alteração de um campo do cabeçalho (nome, cor, datas, status): otimista, com rollback se a API recusar. As datas chegam como
   * `yyyy-mm-dd`; a previsão de fim tem de ser posterior ao início (a API confere de novo).
   */
  alterarCampo(alteracao: ProjetoAlterarDto): void {
    const projetoDados = this.projeto();
    if (!projetoDados) return;
    const inicio = alteracao.inicioData ?? projetoDados.inicioData;
    const fim = alteracao.previsaoFimData ?? projetoDados.previsaoFimData;
    if (inicio && fim && fim <= inicio) {
      this.messageService.add({ severity: 'warn', summary: 'Atenção', detail: 'A previsão de fim deve ser posterior à data de início' });
      return;
    }
    const anterior = projetoDados;
    this.projeto.set({ ...projetoDados, ...alteracao });
    this.projetoService.alterar(projetoDados.id, alteracao).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.projeto.update((atual) => (atual ? { ...atual, ...resposta.dados! } : atual));
      },
      error: () => this.projeto.set(anterior),
    });
  }

  /** Abre a visão escolhida (Grafo ou Controle de horas; a Árvore já está nesta tela) já com o projeto selecionado. */
  abrirVisao(modo: 'grafo' | 'controle-de-horas'): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.router.navigate(['/demanda'], { queryParams: { projetoId: projetoDados.id, modo } });
  }

  abrirRelatorio(): void {
    const projetoDados = this.projeto();
    if (projetoDados) this.router.navigate(['/projeto', projetoDados.id, 'relatorio']);
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

  carregarArvore(projetoId: number): void {
    this.carregandoDemandas.set(true);
    this.erroAoCarregarDemandas.set(false);
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
        error: () => this.erroAoCarregarDemandas.set(true),
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
