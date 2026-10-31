import { montarEsqueletoDeTabela } from '../../../../shared/components/skeleton-lista/esqueleto-tabela';
import { Component, inject, signal, DestroyRef, OnInit, HostListener, computed, effect, untracked, viewChild } from '@angular/core';
import { ExecucaoRegistroDialogComponent } from '../../components/execucao-registro-dialog/execucao-registro-dialog.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, debounceTime, distinctUntilChanged, forkJoin, of, catchError, map, Observable } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule, Popover } from 'primeng/popover';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import {
  AtividadePrioridadeResumoDto,
  AtividadeResumoDto,
  TipoAtividadeStatusEnum,
  AtividadeListarDto,
  AtividadeAlterarDto,
  TagResumoDto,
  UsuarioResumoDto,
  TipoUsuarioStatusEnum,
  ExecucaoItemDto,
  ExecucaoIniciarDto,
  ExecucaoEncerrarDto,
  temPermissaoDeGestor,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { AtividadePrioridadeService } from '../../../../core/services/atividade-prioridade.service';
import { ExecucaoService } from '../../../execucao/services/execucao.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import {
  ATIVIDADE_STATUS_OPCOES,
  ATIVIDADE_STATUS_NAO_DESENVOLVIDA,
  ATIVIDADE_STATUS_EXECUTAVEL,
  severidadeStatusAtividade,
  rotuloStatusAtividade,
  SeveridadeTag,
} from '../../models/atividade.model';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { AtividadePrioridadesDialogComponent } from '../../components/atividade-prioridades-dialog/atividade-prioridades-dialog.component';
import { AtividadeNovaDialogComponent } from '../../components/atividade-nova-dialog/atividade-nova-dialog.component';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';
import { ExecucaoAtivaService } from '../../../../core/services/execucao-ativa.service';
import { PrioridadeSeloComponent } from '../../../../shared/components/prioridade-selo/prioridade-selo.component';
import { focoEmCampo, haSobreposicaoAberta } from '../../../../core/utils/atalhos';
import { AtividadeEmExecucaoComponent } from '../../components/atividade-em-execucao/atividade-em-execucao.component';
import { TagListaComponent } from '../../../../shared/components/tag-lista/tag-lista.component';
import { AtividadeTagsPopoverComponent } from '../../components/atividade-tags-popover/atividade-tags-popover.component';
import { AtividadeDocumentosIndicadorComponent, CampoDocumentoDaDemanda } from '../../components/atividade-documentos-indicador/atividade-documentos-indicador.component';
import { AtividadeDemandaPainelComponent } from '../../components/atividade-demanda-painel/atividade-demanda-painel.component';
import { AtividadePrioridadeBolinhaComponent } from '../../components/atividade-prioridade-bolinha/atividade-prioridade-bolinha.component';
import { AlcaDivisaoComponent } from '../../../../shared/components/alca-divisao/alca-divisao.component';
import { AtividadeStatusIconeComponent } from '../../components/atividade-status-icone/atividade-status-icone.component';
import { AtividadeBarraEmMassaComponent } from '../../components/atividade-barra-em-massa/atividade-barra-em-massa.component';
import {
  FiltrosAtividade,
  contarFiltrosAtivos,
  filtrosIguais,
  filtrosPadrao,
  lerFiltrosDaUrl,
  paraParametrosDaUrl,
} from '../../utils/filtros-atividade.util';

@Component({
  selector: 'app-atividade-listagem',
  standalone: true,
  imports: [
    TagListaComponent,
    PrioridadeSeloComponent,
    SkeletonListaComponent,
    BarraRecargaComponent,
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    AtividadeNovaDialogComponent,
    AtividadePrioridadesDialogComponent,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    Select,
    MultiSelectModule,
    InputTextModule,
    TextareaModule,
    DialogModule,
    DatePickerModule,
    Tag,
    TooltipModule,
    PopoverModule,
    MenuModule,
    AtividadeEmExecucaoComponent,
    AtividadeTagsPopoverComponent,
    AtividadeDocumentosIndicadorComponent,
    AtividadeDemandaPainelComponent,
    AtividadeStatusIconeComponent,
    AlcaDivisaoComponent,
    AtividadePrioridadeBolinhaComponent,
    AtividadeBarraEmMassaComponent,
    ExecucaoRegistroDialogComponent,
    AssistenteDescricaoComponent,
    DataBrasileiraPipe,
    MinutosParaHorasPipe,
    TempoExibicaoPipe,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './atividade-listagem.page.html',
  styleUrl: './atividade-listagem.page.scss',
})
export class AtividadeListagemPage implements OnInit {
  private readonly atividadeService = inject(AtividadeService);
  private readonly execucaoService = inject(ExecucaoService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly demandaService = inject(DemandaService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly roteador = inject(Router);
  private readonly desfazerService = inject(DesfazerService);
  protected readonly execucaoAtiva = inject(ExecucaoAtivaService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly sessao = inject(UsuarioSessaoService);
  /** Os rótulos e as larguras da tabela real (seleção e Usuário só para o gestor), para o esqueleto não parecer outra tela. */
  readonly esqueleto = computed(() =>
    montarEsqueletoDeTabela([
      ...(this.sessao.eGestor() ? [{ rotulo: '', peso: 36 }] : []),
      { rotulo: 'Projeto', peso: 71 },
      { rotulo: 'Demanda', peso: 212 },
      { rotulo: 'Atividade', peso: 124 },
      ...(this.sessao.eGestor() ? [{ rotulo: 'Usuário', peso: 93 }] : []),
      { rotulo: 'Prioridade', peso: 119 },
      { rotulo: 'Status', peso: 138 },
      { rotulo: 'Tempo executado', peso: 97 },
      { rotulo: 'Tags', peso: 67 },
      { rotulo: 'Ações', peso: 124 },
    ]),
  );
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly formularioFiltros = this.formBuilder.group({
    status:    [ATIVIDADE_STATUS_NAO_DESENVOLVIDA as TipoAtividadeStatusEnum[]],
    usuarioId: [null as number | null],
    busca:     [''],
    intervalo: [null as (Date | null)[] | null],
  });

  /** Os filtros em vigor: vêm da URL (a fonte do estado), então voltar à tela os restaura e o link é compartilhável. */
  readonly filtros = signal<FiltrosAtividade>(filtrosPadrao());
  readonly filtrosAtivos = computed(() => contarFiltrosAtivos(this.filtros()));
  readonly demandaId = computed(() => this.filtros().demandaId);
  /** O nome da demanda do chip de contexto (vem da primeira linha carregada ou de uma busca quando a lista está vazia). */
  readonly nomeDemandaFiltrada = signal<string>('');
  private nomeDemandaBuscadoPara: number | null = null;
  /** "Minhas atividades" ligado: o filtro de usuário é o próprio gestor. */
  readonly minhasAtivas = computed(() => !!this.sessao.id() && this.filtros().usuarioId === this.sessao.id());
  readonly atividades = signal<AtividadeResumoDto[]>([]);
  /** Mantém o DOM das linhas ao atualizar uma atividade in-place (sem remontar nem piscar). */
  readonly rastrearPorId = (_indice: number, atividade: AtividadeResumoDto): number => atividade.id;
  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  /** A última consulta falhou: a tela mostra o aviso com "Tentar de novo" em vez de dizer que não há atividades (P-058). */
  readonly erroAoCarregar = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(10);

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  protected readonly prioridadeService = inject(AtividadePrioridadeService);
  readonly atividadePrioridadeEdicao = signal<AtividadeResumoDto | null>(null);
  readonly severidadeStatus = severidadeStatusAtividade;
  readonly rotuloStatus = rotuloStatusAtividade;

  // --- Troca de status inline ---
  readonly atividadeStatusEdicao = signal<AtividadeResumoDto | null>(null);

  // --- Tags inline (popover na célula) e em massa ---
  readonly carregandoTags = signal<boolean>(false);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly atividadeTags = signal<AtividadeResumoDto | null>(null);
  private readonly tagsPopoverLinha = viewChild.required<AtividadeTagsPopoverComponent>('tagsPopoverLinha');

  // --- Menu ⋮ da linha ---
  private readonly menuAcoes = viewChild<Menu>('menuAcoes');
  itensMenu: MenuItem[] = [];

  // --- Seleção múltipla (gestor) ---
  selecionadas: AtividadeResumoDto[] = [];
  readonly quantidadeSelecionada = signal<number>(0);
  readonly executandoEmMassa = signal<boolean>(false);

  private readonly novaDialog = viewChild.required<AtividadeNovaDialogComponent>('novaDialog');

  // --- Demanda ao lado da lista (task 288): clicar num dos três ícones divide a tela, em vez de abrir um dialog ---
  readonly aberta = signal<{ atividadeId: number; demandaId: number; nomeProjeto: string; nomeDemanda: string; campo: CampoDocumentoDaDemanda } | null>(null);
  /** A lista encolhida com a demanda ao lado: some Usuário, Tempo e Tags, e prioridade e status viram bolinha e ícone. */
  readonly dividido = computed(() => this.aberta() !== null);
  private readonly painel = viewChild(AtividadeDemandaPainelComponent);

  // --- Dialog: iniciar/encerrar execução ---
  readonly mostrarDialogExecucao = signal<boolean>(false);
  readonly salvandoExecucao = signal<boolean>(false);
  readonly modoExecucao = signal<'iniciar' | 'encerrar'>('iniciar');
  readonly atividadeExecucao = signal<AtividadeResumoDto | null>(null);
  readonly execucoesDialogExecucao = signal<ExecucaoItemDto[]>([]);
  readonly carregandoExecucoesDialog = signal<boolean>(false);

  readonly formularioExecucao = this.formBuilder.group({
    descricao: ['', [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
  });
  /** Descrição opcional quando o dono da atividade em execução é gestor. */
  readonly descricaoExecucaoOpcional = signal<boolean>(false);

  private readonly registroDialog = viewChild.required<ExecucaoRegistroDialogComponent>('registroDialog');

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  constructor() {
    // Pausar pelo chip da topbar muda a linha da atividade: a lista se atualiza (task 95).
    let pausasVistas = this.execucaoAtiva.pausasDoChip();
    effect(() => {
      const pausas = this.execucaoAtiva.pausasDoChip();
      if (pausas === pausasVistas) return;
      pausasVistas = pausas;
      untracked(() => this.buscarAtividades());
    });
  }

  ngOnInit(): void {
    this.prioridadeService.carregar();
    if (this.sessao.eGestor()) this.carregarUsuarios();

    // A URL é a fonte do estado: cada mudança (clique, Voltar, link) passa por aqui e recarrega.
    this.rotaAtiva.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((parametros) => {
      this.aplicarFiltros(lerFiltrosDaUrl(parametros, this.sessao.eGestor()));
      this.paginaAtual.set(1);
      this.buscarAtividades();
    });

    this.formularioFiltros.controls.busca.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aoMudarFiltro());
  }

  /**
   * Atalhos da listagem: `/` foca a busca e `c` abre "Nova atividade" (o `n` já é das anotações, em qualquer tela). Quietos em campo de
   * texto e com dialog ou popover aberto.
   */
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
    if (focoEmCampo(evento.target) || haSobreposicaoAberta()) return;
    if (evento.key === 'Escape' && this.aberta()) {
      this.fecharDemanda();
    } else if (evento.key === '/') {
      evento.preventDefault();
      document.getElementById('filtro-busca')?.focus();
    } else if (evento.key.toLowerCase() === 'c' && !evento.shiftKey) {
      evento.preventDefault();
      this.novaDialog().abrir(this.demandaId());
    }
  }

  /**
   * Recarrega a listagem e a execução ativa ao retornar à tela: `visibilitychange`
   * cobre a troca de aba/minimização; `window:focus` cobre o retorno de outro
   * aplicativo (Alt-Tab), cenário em que `visibilitychange` não dispara. A guarda
   * `carregando` evita a dupla requisição quando os dois eventos disparam juntos.
   */
  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  aoVoltarParaAba(): void {
    if (document.visibilityState !== 'visible' || this.carregando()) return;
    this.buscarAtividades();
  }

  buscarAtividades(): void {
    this.carregando.set(true);
    this.erroAoCarregar.set(false);

    const aplicados = this.filtros();
    const filtros: AtividadeListarDto = {
      pagina:         this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };

    if (aplicados.demandaId) filtros.demandaId = aplicados.demandaId;
    if (aplicados.status.length) filtros.status = aplicados.status;
    if (aplicados.usuarioId) filtros.usuarioId = aplicados.usuarioId;
    if (aplicados.busca.trim()) filtros.busca = aplicados.busca.trim();
    if (aplicados.periodo?.[0]) filtros.dataInicio = aplicados.periodo[0];
    if (aplicados.periodo?.[1]) filtros.dataFim = aplicados.periodo[1];

    this.atividadeService
      .listar(filtros)
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.atividades.set(resposta.dados.itens);
            this.totalRegistros.set(resposta.dados.totalItens);
            this.descobrirNomeDaDemanda();
          }
        },
        // Mantém as linhas que já estavam na tela; o aviso diz que elas podem estar desatualizadas.
        error: () => this.erroAoCarregar.set(true),
      });
  }

  aoCarregarTabela(evento: TableLazyLoadEvent): void {
    const primeira = evento.first ?? 0;
    const linhas = evento.rows ?? 10;
    const pagina = Math.floor(primeira / linhas) + 1;
    // O paginador dispara o carregamento ao montar: sem mudança de página ou de tamanho, a URL já recarregou.
    if (pagina === this.paginaAtual() && linhas === this.itensPorPagina()) return;
    this.paginaAtual.set(pagina);
    this.itensPorPagina.set(linhas);
    this.buscarAtividades();
  }

  /** Um filtro mudou no formulário: vai para a URL, que recarrega. */
  aoMudarFiltro(): void {
    this.irParaFiltros(this.filtrosDoFormulario());
  }

  limparFiltros(): void {
    this.irParaFiltros(filtrosPadrao());
  }

  /** O chip "Minhas atividades" (gestor): liga e desliga o filtro de usuário pelo próprio gestor. */
  alternarMinhas(): void {
    const eu = this.sessao.id();
    if (!eu) return;
    this.irParaFiltros({ ...this.filtros(), usuarioId: this.minhasAtivas() ? null : eu });
  }

  /** O "✕" do chip "Demanda: X": volta a todas as demandas. */
  removerFiltroDeDemanda(): void {
    this.irParaFiltros({ ...this.filtros(), demandaId: null });
  }

  private filtrosDoFormulario(): FiltrosAtividade {
    const { status, usuarioId, busca } = this.formularioFiltros.value;
    const [inicio, fim] = this.formularioFiltros.controls.intervalo.value ?? [];
    const periodo: [string | null, string | null] | null =
      inicio instanceof Date || fim instanceof Date
        ? [inicio instanceof Date ? this.formatarData(inicio) : null, fim instanceof Date ? this.formatarData(fim) : null]
        : null;
    return { busca: (busca ?? '').trim(), status: status ?? [], usuarioId: usuarioId ?? null, periodo, demandaId: this.filtros().demandaId };
  }

  /** Vai para a URL com os filtros (sem empilhar histórico); se nada mudou, só recarrega. */
  private irParaFiltros(novos: FiltrosAtividade): void {
    if (filtrosIguais(novos, this.filtros())) {
      this.aplicarFiltros(novos);
      this.paginaAtual.set(1);
      this.buscarAtividades();
      return;
    }
    void this.roteador.navigate([], { relativeTo: this.rotaAtiva, queryParams: paraParametrosDaUrl(novos), replaceUrl: true });
  }

  /** Espelha os filtros da URL no formulário (sem disparar a busca) e nos sinais. */
  private aplicarFiltros(filtros: FiltrosAtividade): void {
    this.filtros.set(filtros);
    const [inicio, fim] = filtros.periodo ?? [null, null];
    this.formularioFiltros.patchValue(
      {
        status: filtros.status,
        usuarioId: filtros.usuarioId,
        busca: filtros.busca,
      },
      { emitEvent: false },
    );
    // O tipo do grupo (FormBuilder com tupla) não aceita o intervalo no `patchValue`: o controle é definido à parte.
    this.formularioFiltros.controls.intervalo.setValue((filtros.periodo ? [this.paraData(inicio), this.paraData(fim)] : null) as never, { emitEvent: false });
    this.selecionadas = [];
    this.quantidadeSelecionada.set(0);
  }

  private paraData(iso: string | null): Date | null {
    if (!iso) return null;
    const [ano, mes, dia] = iso.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  /** O nome do chip de contexto: da primeira linha da própria demanda ou, com a lista vazia, de uma consulta (uma vez por demanda). */
  private descobrirNomeDaDemanda(): void {
    const demandaId = this.demandaId();
    if (!demandaId) {
      this.nomeDemandaFiltrada.set('');
      this.nomeDemandaBuscadoPara = null;
      return;
    }
    const daLista = this.atividades().find((atividade) => atividade.demandaId === demandaId);
    if (daLista) {
      this.nomeDemandaFiltrada.set(daLista.nomeDemanda);
      this.nomeDemandaBuscadoPara = demandaId;
      return;
    }
    if (this.nomeDemandaBuscadoPara === demandaId) return;
    this.nomeDemandaBuscadoPara = demandaId;
    this.demandaService.recuperar(demandaId).subscribe({
      next: (resposta) => {
        if (this.demandaId() === demandaId) this.nomeDemandaFiltrada.set(resposta.dados?.nome ?? `#${demandaId}`);
      },
      error: () => this.nomeDemandaFiltrada.set(`#${demandaId}`),
    });
  }

  // ---------------------------------------------------------------------------
  // Troca de status inline
  // ---------------------------------------------------------------------------

  abrirSeletorStatus(evento: Event, atividade: AtividadeResumoDto, popover: Popover): void {
    this.atividadeStatusEdicao.set(atividade);
    popover.toggle(evento);
  }

  abrirSeletorPrioridade(evento: Event, atividade: AtividadeResumoDto, popover: Popover): void {
    this.atividadePrioridadeEdicao.set(atividade);
    popover.toggle(evento);
  }

  alterarPrioridade(nova: AtividadePrioridadeResumoDto, popover: Popover): void {
    const atividade = this.atividadePrioridadeEdicao();
    popover.hide();
    if (!atividade || nova.codigo === atividade.prioridade.codigo) return;

    // Otimista, como o status: o selo muda na hora; se a API recusar (o interceptor já avisou), volta ao anterior.
    const anterior = atividade.prioridade;
    this.definirPrioridadeDaAtividade(atividade.id, nova);
    this.atividadeService.alterar(atividade.id, { prioridade: nova.codigo }).subscribe({
      next: () => this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Prioridade alterada' }),
      error: () => this.definirPrioridadeDaAtividade(atividade.id, anterior),
    });
  }

  private definirPrioridadeDaAtividade(atividadeId: number, prioridade: AtividadePrioridadeResumoDto): void {
    this.atividades.update((lista) => lista.map((item) => (item.id === atividadeId ? { ...item, prioridade } : item)));
  }

  severidadeOpcao(status: TipoAtividadeStatusEnum | null): SeveridadeTag | undefined {
    return status ? this.severidadeStatus(status) : undefined;
  }

  alterarStatus(novoStatus: TipoAtividadeStatusEnum | null, popover: Popover): void {
    const atividade = this.atividadeStatusEdicao();
    popover.hide();

    if (!atividade || !novoStatus || novoStatus === atividade.status) return;

    // Otimista: a tag da linha muda na hora; se a API recusar (o interceptor já avisou), volta ao status anterior.
    const statusAnterior = atividade.status;
    this.definirStatusDaAtividade(atividade.id, novoStatus);

    const dto: AtividadeAlterarDto = { status: novoStatus };
    this.atividadeService.alterar(atividade.id, dto).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
        this.buscarAtividades();
      },
      error: () => this.definirStatusDaAtividade(atividade.id, statusAnterior),
    });
  }

  private definirStatusDaAtividade(atividadeId: number, status: TipoAtividadeStatusEnum): void {
    this.atividades.update((lista) =>
      lista.map((item) => (item.id === atividadeId ? { ...item, status } : item)),
    );
  }

  // ---------------------------------------------------------------------------
  // Tags: popover na célula (salva ao fechar) e em massa
  // ---------------------------------------------------------------------------

  /** Abre o seletor de tags da linha ancorado na célula de tags (`alvo`). */
  abrirTagsDaLinha(evento: Event, atividade: AtividadeResumoDto, alvo: HTMLElement): void {
    if (!this.podeEditar(atividade)) return;
    this.atividadeTags.set(atividade);
    this.garantirTags();
    this.tagsPopoverLinha().abrir(evento, alvo, atividade.tags.map((tag) => tag.id));
  }

  /** O popover fechou com tags mudadas: salva o conjunto da linha. */
  salvarTagsDaLinha(tagIds: number[]): void {
    const atividade = this.atividadeTags();
    if (!atividade) return;
    const anteriores = atividade.tags;
    this.atualizarTagsDaAtividade(atividade.id, this.todasAsTags().filter((tag) => tagIds.includes(tag.id)));
    this.atividadeService.alterarTags(atividade.id, { tagIds }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.atualizarTagsDaAtividade(atividade.id, resposta.dados.tags);
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
      },
      error: () => this.atualizarTagsDaAtividade(atividade.id, anteriores),
    });
  }

  garantirTags(): void {
    if (this.todasAsTags().length === 0 && !this.carregandoTags()) this.carregarTodasAsTags();
  }

  // ---------------------------------------------------------------------------
  // Demanda ao lado da lista (task 288)
  // ---------------------------------------------------------------------------

  /** O ícone da linha: abre a demanda ao lado; no que já está aberto, fecha; noutra linha ou aba, troca. */
  alternarDemanda(atividade: AtividadeResumoDto, campo: CampoDocumentoDaDemanda): void {
    const atual = this.aberta();
    const jaAberto = atual?.atividadeId === atividade.id && atual.campo === campo;
    this.confirmarAntesDeSair(() =>
      this.aberta.set(
        jaAberto
          ? null
          : { atividadeId: atividade.id, demandaId: atividade.demandaId, nomeProjeto: atividade.nomeProjeto, nomeDemanda: atividade.nomeDemanda, campo },
      ),
    );
  }

  /** Clique no nome da atividade com a demanda ao lado: a demanda dela passa para o painel, na mesma aba. */
  abrirDemandaDaLinha(atividade: AtividadeResumoDto): void {
    const atual = this.aberta();
    if (atual && atual.atividadeId !== atividade.id) this.alternarDemanda(atividade, atual.campo);
  }

  trocarAbaDaDemanda(campo: CampoDocumentoDaDemanda): void {
    this.aberta.update((atual) => (atual ? { ...atual, campo } : atual));
  }

  fecharDemanda(): void {
    this.confirmarAntesDeSair(() => this.aberta.set(null));
  }

  /** Texto salvo no painel: acende ou apaga o ícone da linha conforme a demanda tenha ou não o texto. */
  aoTextoSalvo(evento: { demandaId: number; campo: CampoDocumentoDaDemanda; temConteudo: boolean }): void {
    const chave =
      evento.campo === 'descricaoCliente' ? 'demandaTemDescricaoCliente'
      : evento.campo === 'descricaoTecnica' ? 'demandaTemDescricaoTecnica'
      : 'demandaTemDocumentacao';
    this.atividades.update((lista) => lista.map((item) => (item.demandaId === evento.demandaId ? { ...item, [chave]: evento.temConteudo } : item)));
  }

  private confirmarAntesDeSair(seguir: () => void): void {
    const painel = this.painel();
    if (painel) painel.confirmarAntesDeSair(seguir);
    else seguir();
  }

  // ---------------------------------------------------------------------------
  // Execução (play/pause)
  // ---------------------------------------------------------------------------

  podeExecutar(atividade: AtividadeResumoDto): boolean {
    return this.sessao.eGestor() || atividade.usuarioId === this.sessao.id();
  }

  /** Gestor, ou desenvolvedor dono da atividade. Mesma regra de `podeExecutar`. */
  podeEditar(atividade: AtividadeResumoDto): boolean {
    return this.podeExecutar(atividade);
  }

  /** Há execução em andamento nesta atividade (de qualquer usuário). */
  atividadeEmExecucao(atividade: AtividadeResumoDto): boolean {
    return atividade.execucaoAtivaId !== null;
  }

  /** Play só é permitido em atividades planejadas ou em desenvolvimento. */
  podeIniciarExecucao(atividade: AtividadeResumoDto): boolean {
    return ATIVIDADE_STATUS_EXECUTAVEL.includes(atividade.status);
  }

  /** O início da execução em andamento **do usuário logado** nesta atividade (para o cronômetro da linha); as dos outros não têm início na listagem. */
  inicioDaExecucaoPropria(atividade: AtividadeResumoDto): Date | null {
    const propria = this.execucaoAtiva.ativa();
    return propria && propria.atividadeId === atividade.id ? new Date(propria.inicioData) : null;
  }

  /** Por que o play está apagado (o status não deixa iniciar), ou vazio quando está livre. */
  motivoPlayIndisponivel(atividade: AtividadeResumoDto): string {
    return this.podeIniciarExecucao(atividade) ? '' : 'Mude o status para Planejada ou Desenvolvendo';
  }

  /** O status não pode ser trocado enquanto houver execução em andamento. */
  podeTrocarStatus(atividade: AtividadeResumoDto): boolean {
    return this.podeEditar(atividade) && !this.atividadeEmExecucao(atividade);
  }

  alternarExecucao(atividade: AtividadeResumoDto): void {
    const modo = this.atividadeEmExecucao(atividade) ? 'encerrar' : 'iniciar';
    this.modoExecucao.set(modo);
    this.atividadeExecucao.set(atividade);

    const descricaoInicial = modo === 'encerrar' ? atividade.execucaoAtivaDescricao ?? '' : '';
    this.formularioExecucao.reset({ descricao: descricaoInicial });

    // Descrição obrigatória apenas quando o dono da atividade é desenvolvedor.
    const donoEhGestor = !!atividade.usuarioTipo && temPermissaoDeGestor(atividade.usuarioTipo);
    this.descricaoExecucaoOpcional.set(donoEhGestor);
    const controleDescricao = this.formularioExecucao.get('descricao')!;
    controleDescricao.setValidators(
      donoEhGestor
        ? [Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]
        : [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)],
    );
    controleDescricao.updateValueAndValidity();

    this.carregarExecucoesDialog(atividade.id);
    this.mostrarDialogExecucao.set(true);
  }

  confirmarExecucao(): void {
    if (this.formularioExecucao.invalid) {
      this.formularioExecucao.markAllAsTouched();
      return;
    }

    const atividade = this.atividadeExecucao();
    if (!atividade) return;

    const descricao = this.formularioExecucao.value.descricao!.trim();
    this.salvandoExecucao.set(true);

    if (this.modoExecucao() === 'iniciar') {
      const dto: ExecucaoIniciarDto = { atividadeId: atividade.id, descricao };
      this.atividadeService
        .iniciarExecucao(dto)
        .pipe(finalize(() => this.salvandoExecucao.set(false)))
        .subscribe({ next: (resposta) => this.aposExecucao(resposta.sucesso, 'Execução iniciada com sucesso') });
    } else {
      const execucaoAtivaId = atividade.execucaoAtivaId;
      if (execucaoAtivaId === null) {
        this.salvandoExecucao.set(false);
        return;
      }
      const dto: ExecucaoEncerrarDto = { descricao };
      this.atividadeService
        .encerrarExecucao(execucaoAtivaId, dto)
        .pipe(finalize(() => this.salvandoExecucao.set(false)))
        .subscribe({ next: (resposta) => this.aposExecucao(resposta.sucesso, 'Execução encerrada com sucesso') });
    }
  }

  /** Copia a descrição de uma execução anterior para o campo, para retomar o trabalho sem digitar. */
  usarDescricaoExecucao(descricao: string): void {
    this.formularioExecucao.patchValue({ descricao });
    this.formularioExecucao.controls.descricao.markAsDirty();
  }

  aceitarDescricaoAssistenteExecucao(texto: string): void {
    this.formularioExecucao.patchValue({ descricao: texto });
  }

  campoInvalidoExecucao(nomeCampo: string): boolean {
    const controle = this.formularioExecucao.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  abrirDialogRegistro(atividade: AtividadeResumoDto): void {
    this.registroDialog().abrir(atividade);
  }

  // ---------------------------------------------------------------------------
  // Menu ⋮ da linha
  // ---------------------------------------------------------------------------

  /** Menu ⋮ do gestor: registrar execução e excluir. Tags são editadas na própria célula da linha. */
  abrirMenu(evento: Event, atividade: AtividadeResumoDto): void {
    this.itensMenu = [
      { label: 'Registrar execução', icon: 'pi pi-calendar-plus', command: () => this.abrirDialogRegistro(atividade) },
      { separator: true },
      { label: 'Excluir', icon: 'pi pi-trash', styleClass: 'atividade-listagem__menu-excluir', command: () => this.excluir(atividade) },
    ];
    this.menuAcoes()?.toggle(evento);
  }

  // ---------------------------------------------------------------------------
  // Ações em massa (gestor)
  // ---------------------------------------------------------------------------

  aoSelecionar(selecao: AtividadeResumoDto[]): void {
    this.selecionadas = selecao;
    this.quantidadeSelecionada.set(selecao.length);
  }

  limparSelecao(): void {
    this.aoSelecionar([]);
  }

  /** Muda o status de todas as selecionadas; as que o servidor recusa (por exemplo, com execução em andamento) são contadas à parte. */
  mudarStatusEmMassa(status: TipoAtividadeStatusEnum): void {
    const alvos = this.selecionadas.filter((atividade) => atividade.status !== status);
    if (alvos.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Status', detail: 'As selecionadas já estão com esse status' });
      return;
    }
    this.aplicarEmMassa(
      alvos.map((atividade) => this.atividadeService.alterar(atividade.id, { status })),
      `${rotuloStatusAtividade(status)}`,
      'status alterado',
    );
  }

  /** Acrescenta as tags escolhidas às selecionadas, mantendo as que cada uma já tem (a API substitui o conjunto inteiro). */
  acrescentarTagsEmMassa(tagIds: number[]): void {
    const alvos = this.selecionadas.filter((atividade) => tagIds.some((id) => !atividade.tags.some((tag) => tag.id === id)));
    if (alvos.length === 0) {
      this.messageService.add({ severity: 'info', summary: 'Tags', detail: 'As selecionadas já têm essas tags' });
      return;
    }
    this.aplicarEmMassa(
      alvos.map((atividade) => {
        const uniao = [...new Set([...atividade.tags.map((tag) => tag.id), ...tagIds])];
        return this.atividadeService.alterarTags(atividade.id, { tagIds: uniao });
      }),
      'Tags acrescentadas',
      'tags acrescentadas',
    );
  }

  /** Exclui as selecionadas (soft delete); o toast desfaz todas de uma vez. */
  excluirEmMassa(): void {
    const alvos = [...this.selecionadas];
    if (alvos.length === 0) return;
    this.executandoEmMassa.set(true);
    const resultados = alvos.map((atividade) =>
      this.atividadeService.excluir(atividade.id).pipe(
        map(() => atividade),
        catchError(() => of(null)),
      ),
    );
    forkJoin(resultados)
      .pipe(finalize(() => this.executandoEmMassa.set(false)))
      .subscribe((feitas) => {
        const excluidas = feitas.filter((atividade): atividade is AtividadeResumoDto => atividade !== null);
        this.limparSelecao();
        this.buscarAtividades();
        if (excluidas.length === 0) return;
        this.desfazerService.oferecer({
          mensagem: excluidas.length === 1 ? `Atividade "${excluidas[0].nome}" excluída` : `${excluidas.length} atividades excluídas`,
          desfazer: () => forkJoin(excluidas.map((atividade) => this.atividadeService.restaurar(atividade.id))),
          aposDesfazer: () => this.buscarAtividades(),
        });
        if (excluidas.length < alvos.length) {
          this.messageService.add({ severity: 'warn', summary: 'Excluir', detail: `${alvos.length - excluidas.length} não puderam ser excluídas` });
        }
      });
  }

  /** Roda as chamadas, recarrega a lista e resume: quantas deram certo e quantas o servidor recusou. */
  private aplicarEmMassa(chamadas: Observable<unknown>[], titulo: string, verbo: string): void {
    this.executandoEmMassa.set(true);
    forkJoin(chamadas.map((chamada) => chamada.pipe(map(() => true), catchError(() => of(false)))))
      .pipe(finalize(() => this.executandoEmMassa.set(false)))
      .subscribe((resultados) => {
        const certas = resultados.filter(Boolean).length;
        const falhas = resultados.length - certas;
        this.buscarAtividades();
        this.messageService.add({
          severity: falhas === 0 ? 'success' : 'warn',
          summary: titulo,
          detail: falhas === 0 ? `${certas} ${certas === 1 ? 'atividade' : 'atividades'}: ${verbo}` : `${certas} ok, ${falhas} não puderam ser alteradas (por exemplo, com execução em andamento)`,
        });
      });
  }

  // ---------------------------------------------------------------------------
  // Auxiliares de tabela
  // ---------------------------------------------------------------------------

  iniciais(nome: string): string {
    return (nome ?? '')
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  /** Exclusão imediata (task 99): a linha sai na hora e o toast oferece "Desfazer". */
  excluir(atividade: AtividadeResumoDto): void {
    const listaAnterior = this.atividades();
    const totalAnterior = this.totalRegistros();
    this.atividades.set(listaAnterior.filter((item) => item.id !== atividade.id));
    this.totalRegistros.set(Math.max(0, totalAnterior - 1));
    this.aoSelecionar(this.selecionadas.filter((item) => item.id !== atividade.id));

    this.atividadeService.excluir(atividade.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Atividade "${atividade.nome}" excluída`,
          desfazer: () => this.atividadeService.restaurar(atividade.id),
          aposDesfazer: () => this.buscarAtividades(),
        }),
      error: () => {
        this.atividades.set(listaAnterior);
        this.totalRegistros.set(totalAnterior);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Privados
  // ---------------------------------------------------------------------------

  private aposExecucao(sucesso: boolean, mensagem: string): void {
    if (!sucesso) return;
    this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: mensagem });
    this.mostrarDialogExecucao.set(false);
    this.buscarAtividades();
  }

  private carregarExecucoesDialog(atividadeId: number): void {
    this.carregandoExecucoesDialog.set(true);
    this.execucoesDialogExecucao.set([]);
    this.atividadeService
      .listarExecucoesPorAtividade(atividadeId)
      .pipe(finalize(() => this.carregandoExecucoesDialog.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.execucoesDialogExecucao.set(resposta.dados.itens);
        },
      });
  }

  private carregarUsuarios(): void {
    this.usuarioService.listar({ status: TipoUsuarioStatusEnum.ATIVO, itensPorPagina: 100 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) this.usuarios.set(resposta.dados.itens);
      },
    });
  }

  private carregarTodasAsTags(): void {
    this.carregandoTags.set(true);
    this.tagService
      .listar()
      .pipe(finalize(() => this.carregandoTags.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.todasAsTags.set(resposta.dados);
        },
      });
  }

  /** Atualiza in-place as tags de uma atividade já carregada, sem refazer a listagem. */
  private atualizarTagsDaAtividade(atividadeId: number, tags: TagResumoDto[]): void {
    this.atividades.update((lista) =>
      lista.map((item) => (item.id === atividadeId ? { ...item, tags } : item)),
    );
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
