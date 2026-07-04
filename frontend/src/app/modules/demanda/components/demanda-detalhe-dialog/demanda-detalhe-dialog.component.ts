import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, AbstractControl } from '@angular/forms';
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
  DemandaTagsAtribuirDto,
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
import { DemandaConexaoListaComponent } from '../demanda-conexao-lista/demanda-conexao-lista.component';
import { DemandaMembroListaComponent } from '../demanda-membro-lista/demanda-membro-lista.component';
import { DemandaEdicaoDialogComponent } from '../demanda-edicao-dialog/demanda-edicao-dialog.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DataBrasileiraPipe } from '../../../../shared/pipes/data-brasileira.pipe';
import { TempoDemandaPipe } from '../../../../shared/pipes/tempo-demanda.pipe';
import { VisualizacaoTempoService } from '../../../../core/services/visualizacao-tempo.service';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

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
    DemandaMembroListaComponent,
    DemandaEdicaoDialogComponent,
    DemandaFormularioDialogComponent,
    AssistenteDescricaoComponent,
    DataBrasileiraPipe,
    TempoDemandaPipe,
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

  private readonly demandaService = inject(DemandaService);
  readonly unidadeTempo = inject(VisualizacaoTempoService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly atividadeService = inject(AtividadeService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
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
  readonly atividades = signal<AtividadeResumoDto[]>([]);
  readonly carregandoAtividades = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);

  readonly severidadeStatusAtividade = severidadeStatusAtividade;
  readonly rotuloStatusAtividade = rotuloStatusAtividade;
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly mostrarDialogNovaSubDemanda = signal<boolean>(false);
  readonly mostrarDialogSubEdicao = signal<boolean>(false);
  readonly demandaIdSubEdicao = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);
  readonly carregandoSalvar = signal<boolean>(false);

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

  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

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
      this.demandaIdAtual.set(this.demandaId);
      this.carregarTudo(this.demandaId);
    } else if (mudancas['demandaId'] && !mudancas['demandaId'].firstChange && this.visivel) {
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

  navegarParaSubDemanda(id: number): void {
    this.demandaIdAtual.set(id);
    this.carregarTudo(id);
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
    this.demandaIdAtual.set(ancestral.id);
    this.carregarTudo(ancestral.id);
  }

  navegarParaAtividades(): void {
    this.router.navigate(['/atividade'], { queryParams: { demandaId: this.demandaIdAtual() } });
    this.fechar();
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

  abrirDialogTags(): void {
    const tagIdsAtuais = this.tagsDaDemanda().map((tag) => tag.id);
    this.formularioTags.patchValue({ tagIds: tagIdsAtuais });
    this.mostrarDialogTags.set(true);
  }

  salvarTags(): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;

    const dto: DemandaTagsAtribuirDto = { tagIds: this.formularioTags.value.tagIds ?? [] };

    this.carregandoSalvar.set(true);
    this.demandaService
      .alterarTags(demandaDados.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
          this.mostrarDialogTags.set(false);
          this.carregarTagsDaDemanda(demandaDados.id);
        },
      });
  }

  confirmarExclusao(): void {
    this.confirmationService.confirm({
      message: 'Excluir esta demanda? Esta ação não pode ser desfeita.',
      accept: () => this.excluirDemanda(),
    });
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

  severidadeStatus(status: TipoDemandaStatusEnum): 'secondary' | 'info' | 'success' | 'danger' {
    const mapa: Record<TipoDemandaStatusEnum, 'secondary' | 'info' | 'success' | 'danger'> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'secondary',
      [TipoDemandaStatusEnum.PLANEJADA]: 'info',
      [TipoDemandaStatusEnum.CONCLUIDA]: 'success',
      [TipoDemandaStatusEnum.CANCELADA]: 'danger',
    };
    return mapa[status];
  }

  rotuloStatus(status: TipoDemandaStatusEnum): string {
    const mapa: Record<TipoDemandaStatusEnum, string> = {
      [TipoDemandaStatusEnum.PENDENTE]:  'Pendente',
      [TipoDemandaStatusEnum.PLANEJADA]: 'Planejada',
      [TipoDemandaStatusEnum.CONCLUIDA]:          'Concluída',
      [TipoDemandaStatusEnum.CANCELADA]:          'Cancelada',
    };
    return mapa[status];
  }

  private excluirDemanda(): void {
    const demandaDados = this.demanda();
    if (!demandaDados) return;

    this.demandaService.excluir(demandaDados.id).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Demanda excluída' });
        this.demandaExcluida.emit();
        this.visivelChange.emit(false);
      },
    });
  }

  private carregarTudo(identificador: number): void {
    this.carregando.set(true);
    this.demanda.set(null);
    this.mostrarDialogEditar.set(false);
    this.mostrarDialogNovaSubDemanda.set(false);

    // A lista completa de usuários (GET /usuario) é gestor-only e só alimenta o
    // multiselect "Adicionar" do gestor; o desenvolvedor usa "Participar"/"Sair".
    // Sem este guard, o forkJoin falharia inteiro com 403 para o desenvolvedor.
    forkJoin({
      demanda:    this.demandaService.recuperar(identificador),
      ancestrais: this.demandaService.recuperarAncestral(identificador),
      arvore:     this.demandaService.recuperarArvore(identificador),
      tags:       this.tagService.listar(),
      usuarios:   this.sessao.eGestor()
        ? this.usuarioService.listar({ itensPorPagina: 100 })
        : of(null),
    })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ demanda, ancestrais, arvore, tags, usuarios }) => {
          if (demanda.sucesso && demanda.dados) {
            this.demanda.set(demanda.dados);
            this.carregarTagsDaDemanda(identificador);
            this.carregarDemandasParaConexao(demanda.dados.projetoId, identificador);
            if (this.eMembro()) this.carregarAtividades(identificador);
          }
          if (ancestrais.sucesso && ancestrais.dados) {
            this.ancestrais.set(ancestrais.dados);
          }
          if (arvore.sucesso && arvore.dados) {
            this.subDemandas.set(arvore.dados.filhos ?? []);
          }
          if (tags.sucesso && tags.dados) {
            this.tagsDisponiveis.set(tags.dados);
          }
          if (usuarios && usuarios.sucesso && usuarios.dados) {
            // Gestores não entram no multiselect de membros: têm acesso total a
            // qualquer demanda por serem gestores, sem atribuição em demanda_usuario (task 71).
            this.todosUsuarios.set(
              usuarios.dados.itens.filter((usuario) => usuario.tipo !== TipoUsuarioEnum.GESTOR),
            );
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

  private carregarTagsDaDemanda(demandaId: number): void {
    this.demandaService.listarTags(demandaId).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          this.tagsDaDemanda.set(resposta.dados);
        }
      },
    });
  }

  private carregarDemandasParaConexao(projetoId: number, demandaIdAtual: number): void {
    this.demandaService.listar({ projetoId, itensPorPagina: 200 }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso && resposta.dados) {
          const demandasConexao = resposta.dados.itens
            .filter((demanda) => demanda.id !== demandaIdAtual)
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
