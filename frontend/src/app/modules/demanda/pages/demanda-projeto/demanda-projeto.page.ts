import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  DemandaGrafoDto,
  DemandaPlanejamentoDto,
  TipoDemandaStatusEnum,
  ProjetoResumoDto,
  TagResumoDto,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { ProjetoService } from '../../../projeto/services/projeto.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaToolbarComponent } from '../../components/demanda-toolbar/demanda-toolbar.component';
import { DemandaGrafoComponent } from '../../components/demanda-grafo/demanda-grafo.component';
import { DemandaFormularioDialogComponent } from '../../components/demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaArvorePainelComponent } from '../../components/demanda-arvore-painel/demanda-arvore-painel.component';
import { DemandaArvoreTelaComponent } from '../../components/demanda-arvore-tela/demanda-arvore-tela.component';
import { DemandaControleHorasPainelComponent } from '../../components/demanda-controle-horas-painel/demanda-controle-horas-painel.component';
import { ModoVisualizacao } from '../../models/demanda.model';
import { PastaId, lerPastaDaUrl, pastaInicial, pastaParaUrl } from '../../utils/demanda-pasta.util';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';
import {
  DemandaFiltro,
  FILTRO_VAZIO,
  alternarStatusVisivel,
  contarPorStatus,
  filtroAtivo,
  nosCorrespondentes,
  statusVisiveis,
} from '../../utils/demanda-filtro.util';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';

/** Último projeto e modo usados, lembrados entre visitas (task 106). */
const CHAVE_ULTIMO_PROJETO = 'demanda.ultimoProjetoId';
const CHAVE_ULTIMO_MODO = 'demanda.ultimoModo';
const MODOS_VALIDOS: ModoVisualizacao[] = ['grafo', 'arvore', 'controle-de-horas'];

/**
 * `lista` foi o nome da Árvore até a task 239 e `planejamento` o do Controle de horas até a 240: links e preferências antigos continuam
 * abrindo as mesmas telas.
 */
function normalizarModo(valor: string | null): ModoVisualizacao | null {
  const modo = valor === 'lista' ? 'arvore' : valor === 'planejamento' ? 'controle-de-horas' : valor;
  return modo && (MODOS_VALIDOS as string[]).includes(modo) ? (modo as ModoVisualizacao) : null;
}

function lerArmazenado(chave: string): string | null {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarArmazenado(chave: string, valor: string): void {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    /* armazenamento indisponível: o contexto só não é lembrado */
  }
}

@Component({
  selector: 'app-demanda-projeto',
  standalone: true,
  imports: [SkeletonListaComponent,
    NgTemplateOutlet,
    FormsModule,
    ReactiveFormsModule,
    SelectButtonModule,
    DemandaToolbarComponent,
    ButtonModule,
    DialogModule,
    Select,
    TooltipModule,
    DemandaGrafoComponent,
    DemandaFormularioDialogComponent,
    DemandaArvorePainelComponent,
    DemandaArvoreTelaComponent,
    DemandaControleHorasPainelComponent,
  ],
  templateUrl: './demanda-projeto.page.html',
  styleUrl: './demanda-projeto.page.scss',
})
export class DemandaProjetoPage implements OnInit, OnDestroy {
  private readonly demandaService = inject(DemandaService);
  private readonly projetoService = inject(ProjetoService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly sessao = inject(UsuarioSessaoService);

  readonly projetos = signal<ProjetoResumoDto[]>([]);
  readonly projetoId = signal<number>(0);
  readonly projetoControle = new FormControl<number | null>(null);
  readonly grafo = signal<DemandaGrafoDto | null>(null);
  readonly carregando = signal<boolean>(false);
  readonly carregandoProjetos = signal<boolean>(false);
  readonly modoVisualizacao = signal<ModoVisualizacao>(this.modoInicial());
  readonly mostrarDialogNovaDemanda = signal<boolean>(false);
  readonly planejamento = signal<DemandaPlanejamentoDto[]>([]);
  readonly carregandoPlanejamento = signal<boolean>(false);

  private readonly seletorProjeto = viewChild<Select>('seletorProjeto');
  private readonly toolbar = viewChild<DemandaToolbarComponent>('toolbar');
  /** Hospeda os diálogos que o Controle de horas e o menu de contexto abrem (editar, nova filha, tags, membros e descrição). */
  private readonly painel = viewChild<DemandaArvorePainelComponent>('painel');
  private readonly arvoreTela = viewChild<DemandaArvoreTelaComponent>('arvoreTela');

  /** A pasta escolhida da Árvore: uma só para as três visões, e fica na URL (`?pasta=`). `null` é "Sem pasta". */
  readonly pastaId = signal<PastaId>(null);
  private pastaDaUrl: PastaId | undefined = lerPastaDaUrl(this.route.snapshot.queryParamMap.get('pasta'));
  /** Pedido para abrir uma demanda na Árvore, vindo do Grafo e do Controle de horas; `versao` faz o mesmo clique valer de novo. */
  readonly pedidoAbrirDemanda = signal<{ id: number; versao: number } | null>(null);
  private versaoDoPedido = 0;

  /** Critérios da toolbar (busca, status, tags): valem para a Árvore e para o Grafo. */
  readonly filtro = signal<DemandaFiltro>(FILTRO_VAZIO);
  /** Cópia com atraso do filtro: o Grafo refaz o layout a cada mudança, então não acompanha cada tecla. */
  readonly filtroGrafo = signal<DemandaFiltro>(FILTRO_VAZIO);
  private temporizadorFiltroGrafo?: ReturnType<typeof setTimeout>;

  readonly opcoesModo = computed(() => [
    { rotulo: 'Árvore', valor: 'arvore' as ModoVisualizacao, icone: 'pi pi-sitemap' },
    { rotulo: 'Grafo', valor: 'grafo' as ModoVisualizacao, icone: 'pi pi-share-alt' },
    ...(this.sessao.eGestor() ? [{ rotulo: 'Controle de horas', valor: 'controle-de-horas' as ModoVisualizacao, icone: 'pi pi-chart-bar' }] : []),
  ]);

  private readonly nosDoProjeto = computed(() => this.grafo()?.nos ?? []);
  readonly projetoTemDemandas = computed(() => this.nosDoProjeto().length > 0);
  readonly filtroEstaAtivo = computed(() => filtroAtivo(this.filtro()));

  readonly contagemPorStatus = computed(() => contarPorStatus(this.nosDoProjeto(), this.filtro()));

  readonly tagsDoProjeto = computed<TagResumoDto[]>(() => {
    const porId = new Map<number, TagResumoDto>();
    for (const no of this.nosDoProjeto()) for (const tag of no.tags ?? []) porId.set(tag.id, tag);
    return [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  /** O Grafo recebe só os nós que atendem ao filtro (a busca não traz ancestrais: o grafo não tem hierarquia visual). */
  readonly grafoExibido = computed<DemandaGrafoDto | null>(() => {
    const grafoAtual = this.grafo();
    return grafoAtual ? { ...grafoAtual, nos: nosCorrespondentes(grafoAtual.nos, this.filtroGrafo()) } : null;
  });

  /** Quem está executando cada demanda, quando o planejamento já foi carregado (só gestor). */
  readonly executoresPorDemanda = computed(() => {
    const mapa = new Map<number, string[]>();
    if (!this.sessao.eGestor()) return mapa;
    for (const linha of this.planejamento()) {
      if (linha.executoresAtivos.length) mapa.set(linha.demandaId, linha.executoresAtivos.map((executor) => executor.nomeCompleto));
    }
    return mapa;
  });

  ngOnDestroy(): void {
    clearTimeout(this.temporizadorFiltroGrafo);
  }

  /** `?modo=` vence o último modo usado, que vence o padrão (Árvore). O Controle de horas é só do gestor. */
  private modoInicial(): ModoVisualizacao {
    const candidato = normalizarModo(this.route.snapshot.queryParamMap.get('modo') ?? lerArmazenado(CHAVE_ULTIMO_MODO));
    if (!candidato) return 'arvore';
    return candidato === 'controle-de-horas' && !this.sessao.eGestor() ? 'arvore' : candidato;
  }

  ngOnInit(): void {
    this.carregarProjetos();
    this.projetoControle.valueChanges.subscribe((valor) => {
      if (valor) this.selecionarProjeto(valor);
    });
  }

  selecionarProjeto(projetoId: number): void {
    this.projetoId.set(projetoId);
    gravarArmazenado(CHAVE_ULTIMO_PROJETO, String(projetoId));
    this.limparFiltros();
    this.planejamento.set([]);
    this.pastaDaUrl = undefined;
    this.pastaId.set(null);
    this.atualizarUrl();
    this.carregarGrafo();
    if (this.modoVisualizacao() === 'controle-de-horas' && this.sessao.eGestor()) {
      this.carregarPlanejamento();
    }
  }

  alternarModo(modo: ModoVisualizacao): void {
    if (!modo || modo === this.modoVisualizacao()) return;
    this.modoVisualizacao.set(modo);
    gravarArmazenado(CHAVE_ULTIMO_MODO, modo);
    this.atualizarUrl();
    if (modo === 'controle-de-horas' && this.sessao.eGestor() && this.projetoId()) {
      this.carregarPlanejamento();
    }
  }

  /** Projeto, modo e pasta na URL: o link compartilhado/recarregado volta ao mesmo contexto. */
  private atualizarUrl(): void {
    const queryParams: Record<string, string | number> = { modo: this.modoVisualizacao() };
    if (this.projetoId()) queryParams['projetoId'] = this.projetoId();
    if (this.projetoId() && this.grafo()) queryParams['pasta'] = pastaParaUrl(this.pastaId());
    this.router.navigate([], { queryParams, replaceUrl: true });
  }

  // ---------------------------------------------------------------------------
  // Toolbar: busca, status e tags
  // ---------------------------------------------------------------------------

  aoAlterarFiltro(filtro: DemandaFiltro): void {
    this.filtro.set(filtro);
    clearTimeout(this.temporizadorFiltroGrafo);
    this.temporizadorFiltroGrafo = setTimeout(() => this.filtroGrafo.set(filtro), 200);
  }

  /** Status exibidos agora (todos, quando não há filtro de status): alimenta a legenda do grafo. */
  readonly statusDoFiltro = computed(() => statusVisiveis(this.filtro()));

  /** Legenda do grafo: ligar/desligar um status é o mesmo filtro dos chips da toolbar. */
  alternarStatusVisivel(status: TipoDemandaStatusEnum): void {
    this.aoAlterarFiltro({ ...this.filtro(), status: alternarStatusVisivel(this.filtro(), status) });
  }

  limparFiltros(): void {
    this.aoAlterarFiltro(FILTRO_VAZIO);
  }

  abrirSeletorProjeto(): void {
    this.seletorProjeto()?.show();
  }

  alternarExpansaoGeral(): void {
    this.arvoreTela()?.alternarExpansaoGeral();
  }

  get todosExpandidos(): boolean {
    return this.arvoreTela()?.todosExpandidos() ?? false;
  }

  /** A pasta mudou (clique na coluna, resultado da busca, demanda aberta de dentro): vale para as três visões e vai para a URL. */
  aoEscolherPasta(pasta: PastaId): void {
    if (pasta === this.pastaId()) return;
    this.pastaId.set(pasta);
    this.atualizarUrl();
  }

  /**
   * Abre uma demanda na Árvore, na pasta dela: o clique no nó do Grafo e o "Ver" do Controle de horas (a Árvore é onde a demanda se lê e edita).
   */
  abrirNaArvore(demandaId: number): void {
    this.alternarModo('arvore');
    this.pedidoAbrirDemanda.set({ id: demandaId, versao: ++this.versaoDoPedido });
  }

  /**
   * Atalhos da página (task 106): `/` busca, `C` nova demanda (gestor; o `N` global já abre as Anotações, task 96) e ↑/↓ levam o foco às pastas da Árvore.
   * Ficam quietos com campo em foco, dialog/overlay aberto ou modificador pressionado.
   */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (!this.projetoId() || evento.defaultPrevented) return;
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) return;

    const modo = this.modoVisualizacao();
    if (evento.key === '/' && modo !== 'controle-de-horas') {
      evento.preventDefault();
      this.toolbar()?.focarBusca();
    } else if (evento.key.toLowerCase() === 'c' && this.sessao.eGestor()) {
      evento.preventDefault();
      this.mostrarDialogNovaDemanda.set(true);
    } else if ((evento.key === 'ArrowDown' || evento.key === 'ArrowUp') && modo === 'arvore' && !(evento.target as HTMLElement)?.closest?.('[role="tree"]')) {
      evento.preventDefault();
      this.arvoreTela()?.focar();
    }
  }

  private carregarPlanejamento(): void {
    // Recarga com linhas já na tela não pisca a tabela: o mask só aparece na primeira carga.
    this.carregandoPlanejamento.set(this.planejamento().length === 0);
    this.demandaService
      .listarPlanejamento(this.projetoId())
      .pipe(finalize(() => this.carregandoPlanejamento.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.planejamento.set(resposta.dados);
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o controle de horas' });
        },
      });
  }

  /**
   * Alteração vinda do Controle de horas ou de um diálogo por ele acionado
   * (status, edição, tags, etc.): atualiza o grafo e, se estiver no modo, o planejamento.
   */
  aoAlteradoPlanejamento(): void {
    this.recarregarGrafo();
    this.arvoreTela()?.recarregar();
    if (this.modoVisualizacao() === 'controle-de-horas' && this.sessao.eGestor()) {
      this.carregarPlanejamento();
    }
  }

  /**
   * Status trocado no Controle de horas (otimista, com rollback): aplica no nó do grafo e na linha do
   * planejamento sem refazer nenhuma consulta. Concluída sai do planejamento (ele só lista não-concluídas).
   */
  aoStatusAlterado(alteracao: { demandaId: number; status: TipoDemandaStatusEnum }): void {
    this.grafo.update((grafoAtual) =>
      grafoAtual
        ? { ...grafoAtual, nos: grafoAtual.nos.map((no) => (no.id === alteracao.demandaId ? { ...no, status: alteracao.status } : no)) }
        : grafoAtual,
    );
    this.planejamento.update((linhas) =>
      alteracao.status === TipoDemandaStatusEnum.CONCLUIDA
        ? linhas.filter((linha) => linha.demandaId !== alteracao.demandaId)
        : linhas.map((linha) => (linha.demandaId === alteracao.demandaId ? { ...linha, status: alteracao.status } : linha)),
    );
  }

  /** Estimativa gravada pelo cartão "Sem estimativa": aplica no nó do grafo e na linha do planejamento, sem recarregar. */
  aoHorasEstimadasAlteradas(alteracao: { demandaId: number; horasEstimadas: number }): void {
    this.grafo.update((grafoAtual) =>
      grafoAtual
        ? { ...grafoAtual, nos: grafoAtual.nos.map((no) => (no.id === alteracao.demandaId ? { ...no, horasEstimadas: alteracao.horasEstimadas } : no)) }
        : grafoAtual,
    );
    this.planejamento.update((linhas) =>
      linhas.map((linha) => (linha.demandaId === alteracao.demandaId ? { ...linha, horasEstimadas: alteracao.horasEstimadas } : linha)),
    );
  }

  /** Tags já gravadas pelo painel: atualiza o nó do grafo, sem recarregá-lo. */
  aoTagsAlteradas(alteracao: { demandaId: number; tags: TagResumoDto[] }): void {
    this.grafo.update((grafoAtual) =>
      grafoAtual
        ? { ...grafoAtual, nos: grafoAtual.nos.map((no) => (no.id === alteracao.demandaId ? { ...no, tags: alteracao.tags } : no)) }
        : grafoAtual,
    );
  }

  /** Recarrega o grafo após qualquer alteração feita pelo painel da árvore. */
  recarregarGrafo(): void {
    this.demandaService.recuperarGrafo(this.projetoId()).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.grafo.set(resposta.dados);
          // A pasta escolhida pode ter sido excluída: nesse caso cai na pasta de partida.
          const atual = this.pastaId();
          if (atual !== null && !resposta.dados.nos.some((no) => no.id === atual && no.isEstrutural)) this.aoEscolherPasta(pastaInicial(resposta.dados.nos, undefined));
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível atualizar o grafo' });
      },
    });
  }

  projetoAtual(): ProjetoResumoDto | undefined {
    return this.projetos().find((projeto) => projeto.id === this.projetoId());
  }

  navegarParaProjeto(): void {
    if (this.projetoId()) {
      this.router.navigate(['/projeto', this.projetoId()]);
    } else {
      this.router.navigate(['/projeto']);
    }
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
            const projetoInicial = this.projetoInicial(resposta.dados.itens);
            if (projetoInicial) {
              this.projetoControle.setValue(projetoInicial, { emitEvent: false });
              this.projetoId.set(projetoInicial);
              gravarArmazenado(CHAVE_ULTIMO_PROJETO, String(projetoInicial));
              this.atualizarUrl();
              this.carregarGrafo();
              if (this.modoVisualizacao() === 'controle-de-horas' && this.sessao.eGestor()) this.carregarPlanejamento();
            }
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os projetos' });
        },
      });
  }

  /** `?projetoId=` > último projeto usado > o único projeto disponível; id que não existe mais é ignorado. */
  private projetoInicial(projetos: ProjetoResumoDto[]): number | null {
    const existe = (id: number) => id > 0 && projetos.some((projeto) => projeto.id === id);
    const daUrl = Number(this.route.snapshot.queryParamMap.get('projetoId'));
    if (daUrl > 0) return daUrl;
    const lembrado = Number(lerArmazenado(CHAVE_ULTIMO_PROJETO));
    if (existe(lembrado)) return lembrado;
    return projetos.length === 1 ? projetos[0].id : null;
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
            this.pastaId.set(pastaInicial(resposta.dados.nos, this.pastaDaUrl));
            this.pastaDaUrl = undefined;
            this.atualizarUrl();
          }
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar as demandas' });
        },
      });
  }
}
