import { Component, inject, signal, DestroyRef, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs';
import { TableModule, TableLazyLoadEvent } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { EditorModule } from 'primeng/editor';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { PopoverModule, Popover } from 'primeng/popover';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  AtividadeResumoDto,
  TipoAtividadeStatusEnum,
  AtividadeListarDto,
  AtividadeCriarDto,
  AtividadeAlterarDto,
  TagResumoDto,
  UsuarioResumoDto,
  TipoUsuarioStatusEnum,
  DemandaAtribuidaDto,
  DemandaRecuperadaDto,
  ExecucaoItemDto,
  ExecucaoIniciarDto,
  ExecucaoEncerrarDto,
  ExecucaoRegistrarDto,
  TipoUsuarioEnum,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS_DICA,
} from '@project20/shared';
import { AtividadeService } from '../../services/atividade.service';
import { ExecucaoService } from '../../../execucao/services/execucao.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { DemandaService } from '../../../demanda/services/demanda.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { AtividadeVisualizarDialogComponent } from '../../components/atividade-visualizar-dialog/atividade-visualizar-dialog.component';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { MinutosParaHorasPipe } from '../../../../shared/pipes/minutos-para-horas.pipe';
import { TempoDemandaPipe } from '../../../../shared/pipes/tempo-demanda.pipe';
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

type DemandaAtribuidaOpcao = DemandaAtribuidaDto & { rotulo: string };

type CampoDescricaoDemanda = 'descricaoCliente' | 'descricaoTecnica' | 'documentacao';

@Component({
  selector: 'app-atividade-listagem',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    Select,
    MultiSelectModule,
    InputTextModule,
    TextareaModule,
    DialogModule,
    DatePickerModule,
    EditorModule,
    Tag,
    TooltipModule,
    PopoverModule,
    ConfirmDialogModule,
    AssistenteDescricaoComponent,
    AtividadeVisualizarDialogComponent,
    DataBrasileiraPipe,
    MinutosParaHorasPipe,
    TempoDemandaPipe,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './atividade-listagem.page.html',
  styleUrl: './atividade-listagem.page.scss',
  providers: [ConfirmationService],
})
export class AtividadeListagemPage implements OnInit {
  private readonly atividadeService = inject(AtividadeService);
  private readonly execucaoService = inject(ExecucaoService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly demandaService = inject(DemandaService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly sessao = inject(UsuarioSessaoService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);

  readonly formularioFiltros = this.formBuilder.group({
    status:    [ATIVIDADE_STATUS_NAO_DESENVOLVIDA as TipoAtividadeStatusEnum[]],
    usuarioId: [null as number | null],
    busca:     [''],
    intervalo: [null as (Date | null)[] | null],
  });

  readonly demandaId = signal<number | null>(null);
  readonly atividades = signal<AtividadeResumoDto[]>([]);
  readonly usuarios = signal<UsuarioResumoDto[]>([]);
  readonly totalRegistros = signal<number>(0);
  readonly carregando = signal<boolean>(false);
  readonly paginaAtual = signal<number>(1);
  readonly itensPorPagina = signal<number>(10);

  readonly statusOpcoes = ATIVIDADE_STATUS_OPCOES;
  readonly severidadeStatus = severidadeStatusAtividade;
  readonly rotuloStatus = rotuloStatusAtividade;

  // --- Troca de status inline ---
  readonly atividadeStatusEdicao = signal<AtividadeResumoDto | null>(null);

  // --- Dialog: nova atividade ---
  readonly mostrarDialogNova = signal<boolean>(false);
  readonly salvandoNova = signal<boolean>(false);
  readonly demandasAtribuidas = signal<DemandaAtribuidaOpcao[]>([]);
  readonly carregandoDemandasAtribuidas = signal<boolean>(false);

  readonly formularioNova = this.formBuilder.group({
    nome:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    demandaId: [null as number | null, [Validators.required]],
    usuarioId: [null as number | null],
    status:    [TipoAtividadeStatusEnum.DESENVOLVENDO as TipoAtividadeStatusEnum, [Validators.required]],
    descricao: [''],
    tagIds:    [[] as number[]],
  });

  // --- Dialog: atribuir tags ---
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly salvandoTags = signal<boolean>(false);
  readonly carregandoTags = signal<boolean>(false);
  readonly todasAsTags = signal<TagResumoDto[]>([]);
  readonly atividadeTags = signal<AtividadeResumoDto | null>(null);

  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

  // --- Dialog: descrições da demanda ---
  readonly mostrarDialogDescricao = signal<boolean>(false);
  readonly carregandoDescricao = signal<boolean>(false);
  readonly demandaDescricao = signal<DemandaRecuperadaDto | null>(null);
  readonly nomeDemandaDescricao = signal<string>('');
  readonly campoDescricao = signal<CampoDescricaoDemanda | null>(null);
  readonly editandoDescricao = signal<boolean>(false);
  readonly salvandoDescricaoDemanda = signal<boolean>(false);
  private readonly cacheDemandas = new Map<number, DemandaRecuperadaDto>();

  readonly formularioDescricaoDemanda = this.formBuilder.group({
    valor: [''],
  });

  private readonly rotulosDescricao: Record<CampoDescricaoDemanda, string> = {
    descricaoCliente: 'Descrição do cliente',
    descricaoTecnica: 'Descrição técnica',
    documentacao:     'Documentação',
  };

  /** Apenas descrição técnica e documentação são editáveis — e somente por gestor. */
  private readonly camposEditaveis: CampoDescricaoDemanda[] = ['descricaoTecnica', 'documentacao'];

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

  // --- Dialog: registrar execução manual (somente gestor) ---
  /** Textarea de descrição; recebe o foco ao abrir o dialog, não o campo de início. */
  @ViewChild('descricaoRegistro') private descricaoRegistro?: ElementRef<HTMLTextAreaElement>;
  readonly mostrarDialogRegistro = signal<boolean>(false);
  readonly salvandoRegistro = signal<boolean>(false);
  readonly atividadeRegistro = signal<AtividadeResumoDto | null>(null);

  readonly formularioRegistro = this.formBuilder.group(
    {
      inicioData: [null as Date | null, [Validators.required]],
      fimData:    [null as Date | null, [Validators.required]],
      descricao:  ['', [Validators.required, Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    },
    { validators: [this.fimPosteriorAoInicio] },
  );

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  readonly dicaCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS_DICA;

  ngOnInit(): void {
    const demandaIdParam = Number(this.rotaAtiva.snapshot.queryParamMap.get('demandaId'));
    this.demandaId.set(Number.isFinite(demandaIdParam) && demandaIdParam > 0 ? demandaIdParam : null);

    if (this.sessao.eGestor()) this.carregarUsuarios();

    this.formularioFiltros.controls.busca.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.aoMudarFiltro());

    this.buscarAtividades();
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

    const filtros: AtividadeListarDto = {
      pagina:         this.paginaAtual(),
      itensPorPagina: this.itensPorPagina(),
    };

    const demandaId = this.demandaId();
    if (demandaId) filtros.demandaId = demandaId;

    const { status, usuarioId, busca } = this.formularioFiltros.value;
    if (status?.length) filtros.status = status;
    if (usuarioId)      filtros.usuarioId = usuarioId;
    if (busca?.trim())  filtros.busca = busca.trim();

    const intervalo = this.formularioFiltros.controls.intervalo.value ?? [];
    const [dataInicio, dataFim] = intervalo;
    if (dataInicio instanceof Date) filtros.dataInicio = this.formatarData(dataInicio);
    if (dataFim instanceof Date)    filtros.dataFim = this.formatarData(dataFim);

    this.atividadeService
      .listar(filtros)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.atividades.set(resposta.dados.itens);
            this.totalRegistros.set(resposta.dados.totalItens);
          }
        },
      });
  }

  aoCarregarTabela(evento: TableLazyLoadEvent): void {
    const primeira = evento.first ?? 0;
    const linhas = evento.rows ?? 10;
    this.paginaAtual.set(Math.floor(primeira / linhas) + 1);
    this.itensPorPagina.set(linhas);
    this.buscarAtividades();
  }

  aoMudarFiltro(): void {
    this.paginaAtual.set(1);
    this.buscarAtividades();
  }

  limparFiltros(): void {
    this.formularioFiltros.reset({
      status:    ATIVIDADE_STATUS_NAO_DESENVOLVIDA,
      usuarioId: null,
      busca:     '',
      intervalo: null,
    });
    this.aoMudarFiltro();
  }

  // ---------------------------------------------------------------------------
  // Nova atividade
  // ---------------------------------------------------------------------------

  abrirDialogNova(): void {
    this.formularioNova.reset({
      nome:      '',
      demandaId: this.demandaId(),
      usuarioId: null,
      status:    TipoAtividadeStatusEnum.DESENVOLVENDO,
      descricao: '',
      tagIds:    [],
    });
    if (this.demandasAtribuidas().length === 0) this.carregarDemandasAtribuidas();
    if (this.todasAsTags().length === 0) this.carregarTodasAsTags();
    this.mostrarDialogNova.set(true);
  }

  salvarNova(): void {
    if (this.formularioNova.invalid) {
      this.formularioNova.markAllAsTouched();
      return;
    }

    this.salvandoNova.set(true);
    const valor = this.formularioNova.value;
    const dto: AtividadeCriarDto = {
      demandaId:     valor.demandaId!,
      nome:          valor.nome!,
      status:        valor.status!,
    };
    const descricao = valor.descricao?.trim();
    if (descricao) dto.descricao = descricao;
    if (this.sessao.eGestor() && valor.usuarioId) dto.usuarioId = valor.usuarioId;
    if (valor.tagIds?.length) dto.tagIds = valor.tagIds;

    this.atividadeService
      .criar(dto)
      .pipe(finalize(() => this.salvandoNova.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso) {
            this.messageService.add({
              severity: 'success',
              summary: 'Sucesso',
              detail: 'Atividade criada com sucesso',
            });
            this.mostrarDialogNova.set(false);
            this.aoMudarFiltro();
          }
        },
      });
  }

  aceitarDescricaoAssistenteNova(texto: string): void {
    this.formularioNova.patchValue({ descricao: texto });
  }

  campoInvalidoNova(nomeCampo: string): boolean {
    const controle = this.formularioNova.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  // ---------------------------------------------------------------------------
  // Troca de status inline
  // ---------------------------------------------------------------------------

  abrirSeletorStatus(evento: Event, atividade: AtividadeResumoDto, popover: Popover): void {
    this.atividadeStatusEdicao.set(atividade);
    popover.toggle(evento);
  }

  severidadeOpcao(status: TipoAtividadeStatusEnum | null): SeveridadeTag | undefined {
    return status ? this.severidadeStatus(status) : undefined;
  }

  alterarStatus(novoStatus: TipoAtividadeStatusEnum | null, popover: Popover): void {
    const atividade = this.atividadeStatusEdicao();
    popover.hide();

    if (!atividade || !novoStatus || novoStatus === atividade.status) return;

    const dto: AtividadeAlterarDto = { status: novoStatus };
    this.atividadeService.alterar(atividade.id, dto).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.buscarAtividades();
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Atribuir tags
  // ---------------------------------------------------------------------------

  abrirDialogTags(atividade: AtividadeResumoDto): void {
    this.atividadeTags.set(atividade);
    this.formularioTags.reset({ tagIds: atividade.tags.map((tag) => tag.id) });
    this.mostrarDialogTags.set(true);

    if (this.todasAsTags().length === 0) this.carregarTodasAsTags();
  }

  /** Alterna a seleção de uma tag no controle informado (seletor de chips). */
  alternarTagSelecao(controle: AbstractControl, tagId: number): void {
    const selecionadas = (controle.value as number[] | null) ?? [];
    const novas = selecionadas.includes(tagId)
      ? selecionadas.filter((id) => id !== tagId)
      : [...selecionadas, tagId];
    controle.setValue(novas);
    controle.markAsDirty();
  }

  tagEstaSelecionada(controle: AbstractControl, tagId: number): boolean {
    return ((controle.value as number[] | null) ?? []).includes(tagId);
  }

  salvarTags(): void {
    const atividade = this.atividadeTags();
    if (!atividade) return;

    this.salvandoTags.set(true);
    const tagIds = this.formularioTags.value.tagIds ?? [];

    this.atividadeService
      .alterarTags(atividade.id, { tagIds })
      .pipe(finalize(() => this.salvandoTags.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.atualizarTagsDaAtividade(atividade.id, resposta.dados.tags);
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
            this.mostrarDialogTags.set(false);
          }
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Descrições da demanda (somente leitura)
  // ---------------------------------------------------------------------------

  abrirDescricaoDemanda(atividade: AtividadeResumoDto, campo: CampoDescricaoDemanda): void {
    this.campoDescricao.set(campo);
    this.nomeDemandaDescricao.set(atividade.nomeDemanda);
    this.editandoDescricao.set(false);
    this.mostrarDialogDescricao.set(true);

    const demandaEmCache = this.cacheDemandas.get(atividade.demandaId);
    if (demandaEmCache) {
      this.demandaDescricao.set(demandaEmCache);
      return;
    }

    this.carregandoDescricao.set(true);
    this.demandaDescricao.set(null);
    this.demandaService
      .recuperar(atividade.demandaId)
      .pipe(finalize(() => this.carregandoDescricao.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.cacheDemandas.set(atividade.demandaId, resposta.dados);
            this.demandaDescricao.set(resposta.dados);
          }
        },
      });
  }

  cabecalhoDescricao(): string {
    const campo = this.campoDescricao();
    const rotulo = campo ? this.rotulosDescricao[campo] : '';
    return `${this.nomeDemandaDescricao()} — ${rotulo}`;
  }

  conteudoDescricao(): string | null {
    const demanda = this.demandaDescricao();
    const campo = this.campoDescricao();
    if (!demanda || !campo) return null;
    return demanda[campo];
  }

  /** Classe do ícone de descrição: base + tipo + `--ativo` quando há conteúdo (azul, bold, glow). */
  classeIconeDescricao(
    atividade: AtividadeResumoDto,
    campo: CampoDescricaoDemanda,
    tipo: 'cliente' | 'tecnica' | 'doc',
  ): string {
    const temConteudo =
      campo === 'descricaoCliente' ? atividade.demandaTemDescricaoCliente
      : campo === 'descricaoTecnica' ? atividade.demandaTemDescricaoTecnica
      : atividade.demandaTemDocumentacao;
    const base = `atividade-listagem__icone-descricao atividade-listagem__icone-descricao--${tipo}`;
    return temConteudo ? `${base} atividade-listagem__icone-descricao--ativo` : base;
  }

  /**
   * Descrição técnica e documentação são editáveis pela listagem desde que o usuário
   * possa editar a demanda (gestor, ou desenvolvedor membro — flag `podeEditar`).
   */
  podeEditarCampoDescricao(): boolean {
    const campo = this.campoDescricao();
    const demanda = this.demandaDescricao();
    return !!campo && this.camposEditaveis.includes(campo) && !!demanda?.podeEditar;
  }

  abrirEdicaoDescricao(): void {
    this.formularioDescricaoDemanda.reset({ valor: this.conteudoDescricao() ?? '' });
    this.editandoDescricao.set(true);
  }

  salvarDescricaoDemanda(): void {
    const demanda = this.demandaDescricao();
    const campo = this.campoDescricao();
    if (!demanda || !campo || !this.podeEditarCampoDescricao()) return;

    const valor = this.formularioDescricaoDemanda.value.valor ?? '';
    this.salvandoDescricaoDemanda.set(true);

    this.demandaService
      .alterar(demanda.id, { [campo]: valor })
      .pipe(finalize(() => this.salvandoDescricaoDemanda.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            const demandaAtualizada = { ...demanda, [campo]: valor };
            this.cacheDemandas.set(demanda.id, demandaAtualizada);
            this.demandaDescricao.set(demandaAtualizada);
            this.atualizarFlagDescricao(demanda.id, campo, valor);
            this.editandoDescricao.set(false);
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Descrição salva' });
          }
        },
      });
  }

  aceitarDescricaoAssistenteDemanda(texto: string): void {
    this.formularioDescricaoDemanda.patchValue({ valor: texto });
  }

  private atualizarFlagDescricao(demandaId: number, campo: CampoDescricaoDemanda, valor: string): void {
    const temConteudo = valor.trim() !== '';
    const chave =
      campo === 'descricaoTecnica' ? 'demandaTemDescricaoTecnica' : 'demandaTemDocumentacao';
    this.atividades.update((lista) =>
      lista.map((item) => (item.demandaId === demandaId ? { ...item, [chave]: temConteudo } : item)),
    );
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

  /**
   * Exibe o botão de play/pause. Encerrar (pause) fica sempre disponível quando há
   * execução ativa; iniciar (play) só quando o status permite. Assim, atividades
   * pendentes/desenvolvidas não ganham play, mas execuções já ativas podem ser encerradas.
   */
  mostrarBotaoExecucao(atividade: AtividadeResumoDto): boolean {
    return (
      this.podeExecutar(atividade) &&
      (this.atividadeEmExecucao(atividade) || this.podeIniciarExecucao(atividade))
    );
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
    const donoEhGestor = atividade.usuarioTipo === TipoUsuarioEnum.GESTOR;
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

  aceitarDescricaoAssistenteExecucao(texto: string): void {
    this.formularioExecucao.patchValue({ descricao: texto });
  }

  campoInvalidoExecucao(nomeCampo: string): boolean {
    const controle = this.formularioExecucao.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  // ---------------------------------------------------------------------------
  // Registrar execução manual (somente gestor)
  // ---------------------------------------------------------------------------

  /** Validador cross-field: a data de fim deve ser posterior à data de início. */
  private fimPosteriorAoInicio(controle: AbstractControl): ValidationErrors | null {
    const inicio = controle.get('inicioData')?.value as Date | null;
    const fim = controle.get('fimData')?.value as Date | null;
    if (!inicio || !fim) return null;
    return fim > inicio ? null : { fimAntesDoInicio: true };
  }

  abrirDialogRegistro(atividade: AtividadeResumoDto): void {
    this.atividadeRegistro.set(atividade);
    this.formularioRegistro.reset({ inicioData: null, fimData: null, descricao: '' });
    this.mostrarDialogRegistro.set(true);
  }

  /** Foca a descrição ao abrir o dialog — em vez do primeiro campo (início). */
  focarDescricaoRegistro(): void {
    this.descricaoRegistro?.nativeElement.focus();
  }

  salvarRegistro(): void {
    if (this.formularioRegistro.invalid) {
      this.formularioRegistro.markAllAsTouched();
      return;
    }

    const atividade = this.atividadeRegistro();
    if (!atividade) return;

    const { inicioData, fimData, descricao } = this.formularioRegistro.value;
    const dto: ExecucaoRegistrarDto = {
      atividadeId: atividade.id,
      inicioData:  (inicioData as Date).toISOString(),
      fimData:     (fimData as Date).toISOString(),
      descricao:   (descricao ?? '').trim(),
    };

    this.salvandoRegistro.set(true);
    this.execucaoService
      .registrar(dto)
      .pipe(finalize(() => this.salvandoRegistro.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso) {
            this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Execução registrada com sucesso' });
            this.mostrarDialogRegistro.set(false);
            this.buscarAtividades();
          }
        },
      });
  }

  aceitarDescricaoAssistenteRegistro(texto: string): void {
    this.formularioRegistro.patchValue({ descricao: texto });
  }

  campoInvalidoRegistro(nomeCampo: string): boolean {
    const controle = this.formularioRegistro.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
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

  confirmarExclusao(atividade: AtividadeResumoDto): void {
    this.confirmationService.confirm({
      message: `Deseja excluir a atividade "${atividade.nome}"? Esta ação não pode ser desfeita.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.excluirAtividade(atividade),
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

  private carregarDemandasAtribuidas(): void {
    this.carregandoDemandasAtribuidas.set(true);
    this.demandaService
      .listarAtribuidas()
      .pipe(finalize(() => this.carregandoDemandasAtribuidas.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.demandasAtribuidas.set(
              resposta.dados.map((demanda) => ({ ...demanda, rotulo: `${demanda.nomeProjeto} - ${demanda.nome}` })),
            );
          }
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

  private excluirAtividade(atividade: AtividadeResumoDto): void {
    this.atividadeService.excluir(atividade.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Atividade "${atividade.nome}" excluída com sucesso`,
        });
        this.buscarAtividades();
      },
    });
  }

  private formatarData(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
}
