import { Component, ElementRef, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { EditorModule } from 'primeng/editor';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import {
  DemandaRecuperadaDto,
  DemandaAncestralDto,
  DemandaArvoreItemDto,
  TagResumoDto,
  DemandaMembroDto,
  DemandaConexaoResumoDto,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
  DemandaAlterarDto,
  UsuarioResumoDto,
  TipoUsuarioEnum,
  TipoDemandaStatusEnum,
  AtividadeResumoDto,
  AtividadeListarDto,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { AtividadeService } from '../../../atividade/services/atividade.service';
import {
  severidadeStatusAtividade,
  rotuloStatusAtividade,
} from '../../../atividade/models/atividade.model';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { DemandaArvoreItemComponent } from '../demanda-arvore-item/demanda-arvore-item.component';
import { DemandaStatusChipComponent } from '../demanda-status-chip/demanda-status-chip.component';
import { DemandaTagsCabecalhoComponent } from '../demanda-tags-cabecalho/demanda-tags-cabecalho.component';
import { DemandaMembrosCabecalhoComponent } from '../demanda-membros-cabecalho/demanda-membros-cabecalho.component';
import { DemandaMetricasComponent } from '../demanda-metricas/demanda-metricas.component';
import { DemandaConexaoListaComponent } from '../demanda-conexao-lista/demanda-conexao-lista.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { TempoExibicaoPipe } from '../../../../shared/pipes/tempo-exibicao.pipe';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';
import { DesfazerService } from '../../../../core/services/desfazer.service';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

/** Tudo o que o detalhe mostra de uma demanda: guardado ao navegar para "← Voltar" restaurar sem nova chamada. */
interface EstadoDetalhe {
  demandaId: number;
  demanda: DemandaRecuperadaDto;
  ancestrais: DemandaAncestralDto[];
  subDemandas: DemandaArvoreItemDto[];
  tags: TagResumoDto[];
  membros: DemandaMembroDto[];
  conexoes: DemandaConexaoResumoDto[];
  atividades: AtividadeResumoDto[];
}

@Component({
  selector: 'app-demanda-detalhe-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    EditorModule,
    Tag,
    TooltipModule,
    ConfirmDialogModule,
    DemandaArvoreItemComponent,
    DemandaConexaoListaComponent,
    DemandaStatusChipComponent,
    DemandaTagsCabecalhoComponent,
    DemandaMembrosCabecalhoComponent,
    DemandaMetricasComponent,
    DemandaFormularioDialogComponent,
    AssistenteDescricaoComponent,
    TempoExibicaoPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-detalhe-dialog.component.html',
  styleUrl: './demanda-detalhe-dialog.component.scss',
})
export class DemandaDetalheDialogComponent implements OnChanges {
  @Input({ required: true }) demandaId!: number;
  @Input() visivel = false;
  @Output() visivelChange = new EventEmitter<boolean>();
  @Output() demandaExcluida = new EventEmitter<void>();
  @Output() demandaAlterada = new EventEmitter<void>();
  /** Status trocado pelo chip (já aplicado): o painel atualiza o nó sem recarregar o grafo. */
  @Output() statusAlterado = new EventEmitter<{ demandaId: number; status: TipoDemandaStatusEnum }>();
  @Output() tagsAlteradas = new EventEmitter<{ demandaId: number; tags: TagResumoDto[] }>();

  private readonly demandaService = inject(DemandaService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  readonly demandaIdAtual = signal<number>(0);
  readonly demanda = signal<DemandaRecuperadaDto | null>(null);
  readonly ancestrais = signal<DemandaAncestralDto[]>([]);
  readonly subDemandas = signal<DemandaArvoreItemDto[]>([]);
  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly tagsDaDemanda = signal<TagResumoDto[]>([]);
  readonly todosUsuarios = signal<UsuarioResumoDto[]>([]);
  readonly todasDemandas = signal<Array<{ demandaConectadaId: number; nomeDemandaConectada: string }>>([]);
  readonly membros = signal<DemandaMembroDto[]>([]);
  readonly conexoes = signal<DemandaConexaoResumoDto[]>([]);
  /** Demandas visitadas antes da atual (pilha): "← Voltar" restaura a última sem refazer as chamadas. */
  readonly historico = signal<EstadoDetalhe[]>([]);
  private projetoDasDemandas = 0;

  readonly nomeAnterior = computed(() => this.historico().at(-1)?.demanda.nome ?? '');

  /** Destinos possíveis de uma conexão: demandas do projeto, menos a atual. */
  readonly destinosConexao = computed(() =>
    this.todasDemandas().filter((demanda) => demanda.demandaConectadaId !== this.demandaIdAtual()),
  );

  // --- Título editável ---
  /** O campo nasce dentro de um @if: o foco (e a seleção do texto) é dado assim que ele aparece. */
  @ViewChild('campoTitulo') set campoTitulo(referencia: ElementRef<HTMLInputElement> | undefined) {
    if (!referencia) return;
    setTimeout(() => {
      referencia.nativeElement.focus();
      referencia.nativeElement.select();
    });
  }

  readonly editandoTitulo = signal<boolean>(false);
  readonly tituloEdicao = signal<string>('');
  readonly erroTitulo = signal<string | null>(null);

  readonly descricoes: Array<{ campo: CampoDescricao; rotulo: string; icone: string; classe: string }> = [
    { campo: 'descricaoTecnica', rotulo: 'Descrição técnica',  icone: 'pi pi-code', classe: 'btn-desc--tecnica' },
    { campo: 'descricaoCliente', rotulo: 'Descrição do cliente', icone: 'pi pi-user', classe: 'btn-desc--cliente' },
    { campo: 'documentacao',     rotulo: 'Documentação',       icone: 'pi pi-book', classe: 'btn-desc--doc' },
  ];
  readonly atividades = signal<AtividadeResumoDto[]>([]);
  readonly carregandoAtividades = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);

  readonly severidadeStatusAtividade = severidadeStatusAtividade;
  readonly rotuloStatusAtividade = rotuloStatusAtividade;
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly mostrarDialogNovaSubDemanda = signal<boolean>(false);
  readonly mostrarDialogSubEdicao = signal<boolean>(false);
  readonly demandaIdSubEdicao = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);

  readonly campoDescricaoEditando = signal<CampoDescricao | null>(null);
  readonly mostrarDialogDescricao = signal<boolean>(false);
  readonly carregandoSalvarDescricao = signal<boolean>(false);
  readonly demandaIdDescricaoEditando = signal<number>(0);
  readonly nomeDemandaDescricaoEditando = signal<string>('');

  /**
   * Membresia da demanda (gestor sempre; desenvolvedor quando é membro, via flag
   * `podeEditar` do backend). Gate das ações que exigem ser membro: aba Atividades,
   * edição de tags e criação de sub-demanda.
   */
  readonly eMembro = computed(() => this.sessao.eGestor() || !!this.demanda()?.podeEditar);

  /**
   * Aba inicial das abas de detalhe. Atividades (1) quando membro; para o
   * desenvolvedor não-membro (sem a aba Atividades) cai em Conexões (2).
   */
  readonly abaInicial = computed(() => (this.eMembro() ? '1' : '2'));

  descricaoPreenchida(campo: CampoDescricao): boolean {
    return !!this.demanda()?.[campo];
  }

  tooltipDescricao(campo: CampoDescricao): string {
    const rotulo = this.descricoes.find((descricao) => descricao.campo === campo)!.rotulo;
    const preenchida = this.descricaoPreenchida(campo);
    const podeEditar = campo === 'descricaoCliente' ? this.sessao.eGestor() : this.eMembro();
    return `${rotulo} — ${preenchida ? 'preenchida' : 'vazia'} (clique para ${podeEditar ? 'editar' : 'ver'})`;
  }

  readonly formularioDescricao = this.formBuilder.group({
    valor: ['' as string | null],
  });

  /** Último conteúdo persistido da descrição aberta — base da detecção de alterações não salvas. */
  private readonly descricaoConteudoSalvo = signal<string>('');

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

  /**
   * Editabilidade da demanda cuja descrição está aberta (gestor sempre; desenvolvedor
   * apenas quando é membro). Reflete a flag `podeEditar` retornada pelo backend.
   */
  readonly descricaoEditavel = signal<boolean>(false);

  readonly podeEditarDescricaoAtual = computed(() => {
    const campo = this.campoDescricaoEditando();
    if (!campo) return false;
    // Descrição do cliente é exclusiva do gestor.
    if (campo === 'descricaoCliente') return this.sessao.eGestor();
    // Técnica e documentação: só edita quem pode editar a demanda.
    return this.descricaoEditavel();
  });

  ngOnChanges(mudancas: SimpleChanges): void {
    if (mudancas['visivel']?.currentValue === true) {
      this.historico.set([]);
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    } else if (mudancas['demandaId'] && !mudancas['demandaId'].firstChange && this.visivel) {
      this.historico.set([]);
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    }
  }

  fechar(): void {
    this.visivelChange.emit(false);
  }

  aoDemandaAlterada(): void {
    const idAtual = this.demandaIdAtual();
    if (idAtual) this.carregarDemanda(idAtual);
    this.demandaAlterada.emit();
  }

  aoDemandaCriada(): void {
    const idAtual = this.demandaIdAtual();
    if (idAtual) {
      this.demandaService.recuperarArvore(idAtual).subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.subDemandas.set(resposta.dados.filhos ?? []);
          }
        },
      });
    }
  }

  /** Abre outra demanda dentro do próprio dialog, guardando a atual para o "← Voltar" (sem nova chamada). */
  navegarParaSubDemanda(id: number): void {
    if (id === this.demandaIdAtual()) return;
    this.guardarEstadoAtual();
    this.demandaIdAtual.set(id);
    this.carregarTudo(id);
  }

  private guardarEstadoAtual(): void {
    const demandaAtual = this.demanda();
    if (!demandaAtual) return;
    this.historico.update((pilha) => [
      ...pilha,
      {
        demandaId: demandaAtual.id,
        demanda: demandaAtual,
        ancestrais: this.ancestrais(),
        subDemandas: this.subDemandas(),
        tags: this.tagsDaDemanda(),
        membros: this.membros(),
        conexoes: this.conexoes(),
        atividades: this.atividades(),
      },
    ]);
  }

  /** Volta à demanda anterior restaurando o que estava na tela, sem nenhuma chamada à API. */
  voltar(): void {
    const pilha = this.historico();
    const anterior = pilha.at(-1);
    if (!anterior) return;
    this.historico.set(pilha.slice(0, -1));
    this.demandaIdAtual.set(anterior.demandaId);
    this.demanda.set(anterior.demanda);
    this.ancestrais.set(anterior.ancestrais);
    this.subDemandas.set(anterior.subDemandas);
    this.tagsDaDemanda.set(anterior.tags);
    this.membros.set(anterior.membros);
    this.conexoes.set(anterior.conexoes);
    this.atividades.set(anterior.atividades);
    this.editandoTitulo.set(false);
  }

  abrirSubEdicao(demandaId: number): void {
    this.demandaIdSubEdicao.set(demandaId);
    this.mostrarDialogSubEdicao.set(true);
  }

  abrirNovaFilha(demandaPaiId: number): void {
    this.demandaPaiIdNovaFilha.set(demandaPaiId);
    this.mostrarDialogNovaFilha.set(true);
  }

  navegarParaAncestral(ancestral: DemandaAncestralDto): void {
    this.navegarParaSubDemanda(ancestral.id);
  }

  /** Nova atividade já com a demanda escolhida (vai para o formulário e fecha o detalhe). */
  criarAtividade(): void {
    this.router.navigate(['/atividade', 'nova'], { queryParams: { demandaId: this.demandaIdAtual() } });
    this.fechar();
  }

  /** "Ver todas": a lista abre em outra aba para o detalhe continuar aberto. */
  verTodasAtividades(): void {
    const url = this.router.serializeUrl(
      this.router.createUrlTree(['/atividade'], { queryParams: { demandaId: this.demandaIdAtual() } }),
    );
    window.open(url, '_blank');
  }

  // --- Título, status e métricas inline ---

  iniciarEdicaoTitulo(): void {
    this.tituloEdicao.set(this.demanda()?.nome ?? '');
    this.erroTitulo.set(null);
    this.editandoTitulo.set(true);
  }

  cancelarTitulo(evento?: Event): void {
    evento?.stopPropagation();
    this.editandoTitulo.set(false);
  }

  salvarTitulo(): void {
    if (!this.editandoTitulo()) return;
    const demandaAtual = this.demanda();
    const novoNome = this.tituloEdicao().trim();
    if (!demandaAtual || novoNome === demandaAtual.nome) {
      this.editandoTitulo.set(false);
      return;
    }
    if (!novoNome) {
      this.erroTitulo.set('O título não pode ficar vazio');
      return;
    }
    if (!REGEX_SEM_CARACTERES_PROIBIDOS.test(novoNome)) {
      this.erroTitulo.set(MENSAGEM_CARACTERES_PROIBIDOS);
      return;
    }

    this.editandoTitulo.set(false);
    this.demanda.set({ ...demandaAtual, nome: novoNome });
    this.demandaService.alterar(demandaAtual.id, { nome: novoNome }).subscribe({
      next: () => this.demandaAlterada.emit(),
      error: () => this.demanda.update((atual) => (atual ? { ...atual, nome: demandaAtual.nome } : atual)),
    });
  }

  /** Troca de status pelo chip: otimista, com rollback; o painel recebe o novo status sem recarregar. */
  aoStatusEscolhido(para: TipoDemandaStatusEnum): void {
    const demandaAtual = this.demanda();
    if (!demandaAtual) return;
    const de = demandaAtual.status;
    this.demanda.set({ ...demandaAtual, status: para });
    this.statusAlterado.emit({ demandaId: demandaAtual.id, status: para });
    this.demandaService.alterar(demandaAtual.id, { status: para }).subscribe({
      error: () => {
        this.demanda.update((atual) => (atual ? { ...atual, status: de } : atual));
        this.statusAlterado.emit({ demandaId: demandaAtual.id, status: de });
      },
    });
  }

  /** Estimado/previsão gravados pelo `app-demanda-metricas` (ou revertidos por ele se a API recusou). */
  aoMetricaAlterada(alteracao: { horasEstimadas?: number; previsaoFimData?: string; reverter?: boolean }): void {
    const { reverter, ...campos } = alteracao;
    this.demanda.update((atual) =>
      atual ? { ...atual, ...campos, previsaoFimData: campos.previsaoFimData ?? (reverter && 'previsaoFimData' in campos ? null : atual.previsaoFimData) } : atual,
    );
    if (!reverter) this.demandaAlterada.emit();
  }

  aoTagsAlteradas(tags: TagResumoDto[]): void {
    const demandaAtual = this.demanda();
    if (demandaAtual) this.tagsAlteradas.emit({ demandaId: demandaAtual.id, tags });
  }

  iniciaisUsuario(nome: string): string {
    return (nome ?? '')
      .split(' ')
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }

  private carregarAtividades(demandaId: number): void {
    this.carregandoAtividades.set(true);
    this.atividades.set([]);

    // Gestor vê todas as atividades da demanda; desenvolvedor vê apenas as próprias.
    const filtros: AtividadeListarDto = { demandaId, itensPorPagina: 100 };
    if (!this.sessao.eGestor()) {
      const usuarioId = this.sessao.id();
      if (usuarioId !== undefined) filtros.usuarioId = usuarioId;
    }

    this.atividadeService
      .listar(filtros)
      .pipe(finalize(() => this.carregandoAtividades.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) this.atividades.set(resposta.dados.itens);
        },
      });
  }

  abrirDialogDescricao(campo: CampoDescricao): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;
    const valores: Record<CampoDescricao, string | null | undefined> = {
      descricaoTecnica: demandaDados.descricaoTecnica,
      descricaoCliente: demandaDados.descricaoCliente,
      documentacao:     demandaDados.documentacao,
    };
    this.demandaIdDescricaoEditando.set(demandaDados.id);
    this.nomeDemandaDescricaoEditando.set(demandaDados.nome);
    this.campoDescricaoEditando.set(campo);
    this.descricaoEditavel.set(demandaDados.podeEditar);
    this.formularioDescricao.patchValue({ valor: valores[campo] ?? '' });
    this.descricaoConteudoSalvo.set(valores[campo] ?? '');
    this.mostrarDialogDescricao.set(true);
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
        this.descricaoEditavel.set(demandaDados.podeEditar);
        this.formularioDescricao.patchValue({ valor: valores[campo] ?? '' });
        this.descricaoConteudoSalvo.set(valores[campo] ?? '');
        this.mostrarDialogDescricao.set(true);
      },
    });
  }

  /** Verdadeiro quando o editor tem conteúdo ainda não persistido na base. */
  private descricaoTemAlteracoesNaoSalvas(): boolean {
    return (this.formularioDescricao.value.valor ?? '') !== this.descricaoConteudoSalvo();
  }

  /**
   * Intercepta qualquer fechamento do dialog de descrição (X, ESC, Cancelar). Com
   * alterações não salvas e permissão de edição, pergunta se quer salvar antes de
   * fechar; caso contrário fecha direto.
   */
  aoTentarFecharDescricao(visivel: boolean): void {
    if (visivel) return;
    const precisaConfirmar = this.podeEditarDescricaoAtual() && this.descricaoTemAlteracoesNaoSalvas();
    // Fecha de fato (mantém o signal coerente com o estado real do PrimeNG) e,
    // havendo edições pendentes, pergunta se o usuário quer salvá-las antes.
    this.mostrarDialogDescricao.set(false);
    if (precisaConfirmar) {
      this.confirmationService.confirm({
        key: 'descricao-fechar',
        header: 'Alterações não salvas',
        message: `Você fez alterações em "${this.tituloDialogDescricao()}" que ainda não foram salvas. Deseja salvar antes de fechar?`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Salvar',
        rejectLabel: 'Descartar',
        accept: () => this.salvarDescricao(),
        reject: () => {},
      });
    }
  }

  salvarDescricao(): void {
    const campo = this.campoDescricaoEditando();
    const idEditando = this.demandaIdDescricaoEditando();
    if (!campo || !idEditando || !this.podeEditarDescricaoAtual()) return;

    this.carregandoSalvarDescricao.set(true);
    const valorEnviado = this.formularioDescricao.value.valor ?? '';
    const dto = { [campo]: this.formularioDescricao.value.valor ?? undefined } as DemandaAlterarDto;

    this.demandaService
      .alterar(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarDescricao.set(false)))
      .subscribe({
        next: () => {
          this.descricaoConteudoSalvo.set(valorEnviado);
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: `${this.tituloDialogDescricao()} salva` });
          this.mostrarDialogDescricao.set(false);
          if (idEditando === this.demanda()?.id) {
            this.carregarDemanda(idEditando);
          }
        },
      });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formularioDescricao.patchValue({ valor: texto });
  }

  confirmarExclusao(): void {
    this.confirmationService.confirm({
      header: 'Excluir demanda',
      acceptLabel: 'Excluir',
      message: 'Excluir esta demanda? As sub-demandas e atividades dela deixarão de ser exibidas. Você poderá desfazer logo após a exclusão.',
      accept: () => this.excluirDemanda(),
    });
  }

  private excluirDemanda(): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;

    this.demandaService.excluir(demandaDados.id).subscribe({
      next: () => {
        this.demandaExcluida.emit();
        this.visivelChange.emit(false);
        this.desfazerService.oferecer({
          mensagem: `Demanda "${demandaDados.nome}" excluída`,
          desfazer: () => this.demandaService.restaurar(demandaDados.id),
          aposDesfazer: () => this.demandaExcluida.emit(),
        });
      },
    });
  }

  private carregarTudo(identificador: number): void {
    this.carregando.set(true);
    this.demanda.set(null);
    this.editandoTitulo.set(false);
    this.mostrarDialogEditar.set(false);
    this.mostrarDialogNovaSubDemanda.set(false);

    // A lista completa de usuários (GET /usuario) é gestor-only e só alimenta o autocomplete de membros do
    // gestor; sem este guard o forkJoin falharia inteiro com 403 para o desenvolvedor. Tags e usuários do
    // catálogo só são buscados uma vez por abertura (a navegação interna reaproveita).
    forkJoin({
      demanda:    this.demandaService.recuperar(identificador),
      ancestrais: this.demandaService.recuperarAncestral(identificador),
      arvore:     this.demandaService.recuperarArvore(identificador),
      tagsDaDemanda: this.demandaService.listarTags(identificador),
      membros:    this.demandaService.listarMembros(identificador),
      conexoes:   this.demandaService.listarConexoes(identificador),
      tags:       this.tagsDisponiveis().length ? of(null) : this.tagService.listar(),
      usuarios:   this.sessao.eGestor() && this.todosUsuarios().length === 0
        ? this.usuarioService.listar({ itensPorPagina: 100 })
        : of(null),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ demanda, ancestrais, arvore, tagsDaDemanda, membros, conexoes, tags, usuarios }) => {
          if (demanda.sucesso && demanda.dados) {
            this.demanda.set(demanda.dados);
            this.carregarDemandasParaConexao(demanda.dados.projetoId);
            if (this.eMembro()) this.carregarAtividades(identificador);
            else this.atividades.set([]);
          }
          if (ancestrais.sucesso && ancestrais.dados) this.ancestrais.set(ancestrais.dados);
          if (arvore.sucesso && arvore.dados) this.subDemandas.set(arvore.dados.filhos ?? []);
          if (tagsDaDemanda.sucesso && tagsDaDemanda.dados) this.tagsDaDemanda.set(tagsDaDemanda.dados);
          if (membros.sucesso && membros.dados) this.membros.set(membros.dados);
          if (conexoes.sucesso && conexoes.dados) this.conexoes.set(conexoes.dados);
          if (tags && tags.sucesso && tags.dados) this.tagsDisponiveis.set(tags.dados);
          if (usuarios && usuarios.sucesso && usuarios.dados) {
            // Gestores não entram no autocomplete de membros: têm acesso total por serem gestores (task 71).
            this.todosUsuarios.set(usuarios.dados.itens.filter((usuario) => usuario.tipo !== TipoUsuarioEnum.GESTOR));
          }
        },
      });
  }

  private carregarDemanda(identificador: number): void {
    this.demandaService.recuperar(identificador).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.demanda.set(resposta.dados);
        }
      },
    });
  }

  /** Demandas do projeto para o destino de uma conexão: só recarrega quando o projeto muda. */
  private carregarDemandasParaConexao(projetoId: number): void {
    if (projetoId === this.projetoDasDemandas) return;
    this.demandaService.listar({ projetoId, itensPorPagina: 200 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.projetoDasDemandas = projetoId;
          const demandasConexao = resposta.dados.itens
            .map((demanda) => ({
              demandaConectadaId:   demanda.id,
              nomeDemandaConectada: demanda.nome,
            }));
          this.todasDemandas.set(demandasConexao);
        }
      },
    });
  }
}
