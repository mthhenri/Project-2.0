import { Component, Input, Output, EventEmitter, inject, signal, computed, effect, input, untracked, viewChild, ElementRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MarkdownEditorComponent } from '../../../../shared/components/markdown-editor/markdown-editor.component';
import { MarkdownVisualizadorComponent } from '../../../../shared/components/markdown-visualizador/markdown-visualizador.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  DemandaArvoreItemDto,
  DemandaAlterarDto,
  DemandaTagsAtribuirDto,
  TagResumoDto,
  UsuarioResumoDto,
  temPermissaoDeGestor,
  TipoDemandaStatusEnum,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DemandaArvoreItemComponent } from '../demanda-arvore-item/demanda-arvore-item.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaMembroListaComponent } from '../demanda-membro-lista/demanda-membro-lista.component';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

/**
 * Painel reutilizável da árvore de demandas: renderiza os itens e centraliza todos
 * os diálogos disparados pelo context menu (edição, nova sub-demanda,
 * tags, membros e descrição). Usado tanto na página de demandas do projeto quanto
 * no detalhe do projeto, evitando duplicação dos handlers e dos diálogos.
 *
 * O host fornece as raízes já montadas e recarrega sua fonte de dados ao receber
 * `alterado`.
 */
@Component({
  selector: 'app-demanda-arvore-painel',
  standalone: true,
  imports: [
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    MarkdownEditorComponent,
    MarkdownVisualizadorComponent,
    ConfirmDialogModule,
    AssistenteDescricaoComponent,
    DemandaArvoreItemComponent,
    DemandaFormularioDialogComponent,
    DemandaMembroListaComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './demanda-arvore-painel.component.html',
  styleUrl: './demanda-arvore-painel.component.scss',
})
export class DemandaArvorePainelComponent {
  /** Com valor padrão: o host pode ler `todosExpandidos()` antes de a primeira passada de binding definir as raízes. */
  readonly raizes = input<DemandaArvoreItemDto[]>([]);
  @Input({ required: true }) projetoId!: number;
  /** Termo da busca da toolbar, destacado nos nomes (task 106). */
  readonly termoBusca = input<string>('');
  /** Nós a abrir por causa do filtro ativo (ancestrais dos correspondentes); o usuário pode recolher depois. */
  readonly expandirIds = input<ReadonlySet<number>>(new Set());
  /** Executores ativos por demanda, quando o planejamento está carregado (gestor). */
  readonly executoresPorDemanda = input<ReadonlyMap<number, string[]>>(new Map());
  /** Emitido sempre que uma ação altera a árvore (tags, edição, criação, exclusão, descrição). */
  @Output() alterado = new EventEmitter<void>();
  /** Tags já aplicadas no servidor: o pai atualiza o nó sem recarregar o grafo inteiro (task 98). */
  @Output() tagsAlteradas = new EventEmitter<{ demandaId: number; tags: TagResumoDto[] }>();

  /**
   * Status trocado pelo chip da linha (otimista, com rollback): emitido já ao escolher e de novo com o
   * status anterior se a API recusar. O host aplica no seu estado sem recarregar nada.
   */
  @Output() statusAlterado = new EventEmitter<{ demandaId: number; status: TipoDemandaStatusEnum }>();

  /** Nós expandidos da árvore; guardados aqui para sobreviver a qualquer recarga (task 98). */
  readonly expandidos = signal<ReadonlySet<number>>(new Set<number>());

  private readonly arvoreRef = viewChild<ElementRef<HTMLElement>>('arvore');

  /** Linha com o foco do teclado; só vale com a árvore focada. */
  readonly focoId = signal<number | null>(null);
  readonly arvoreFocada = signal<boolean>(false);

  /** Linhas visíveis na ordem da tela (respeita os ramos expandidos): base da navegação por teclado. */
  private readonly linhasVisiveis = computed(() => {
    const abertos = this.expandidos();
    const linhas: { id: number; paiId: number | null; item: DemandaArvoreItemDto }[] = [];
    const percorrer = (itens: DemandaArvoreItemDto[], paiId: number | null) => {
      for (const item of itens) {
        linhas.push({ id: item.id, paiId, item });
        if (item.filhos.length && abertos.has(item.id)) percorrer(item.filhos, item.id);
      }
    };
    percorrer(this.raizes(), null);
    return linhas;
  });

  /** Ids de todas as demandas que têm filhos: o que "expandir tudo" abre. */
  private readonly idsComFilhos = computed(() => {
    const ids: number[] = [];
    const percorrer = (itens: DemandaArvoreItemDto[]) => {
      for (const item of itens) {
        if (item.filhos.length) {
          ids.push(item.id);
          percorrer(item.filhos);
        }
      }
    };
    percorrer(this.raizes());
    return ids;
  });

  readonly todosExpandidos = computed(() => {
    const ids = this.idsComFilhos();
    const abertos = this.expandidos();
    return ids.length > 0 && ids.every((id) => abertos.has(id));
  });

  constructor() {
    // O filtro ativo abre os ramos com correspondência; só soma (o usuário pode recolher depois).
    effect(() => {
      const abrir = this.expandirIds();
      if (!abrir.size) return;
      untracked(() => this.expandidos.update((atual) => new Set([...atual, ...abrir])));
    });
  }

  alternarExpansao(demandaId: number): void {
    this.expandidos.update((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(demandaId)) proximo.delete(demandaId);
      else proximo.add(demandaId);
      return proximo;
    });
  }

  expandirTudo(): void {
    this.expandidos.set(new Set(this.idsComFilhos()));
  }

  recolherTudo(): void {
    this.expandidos.set(new Set());
  }

  alternarExpansaoGeral(): void {
    if (this.todosExpandidos()) this.recolherTudo();
    else this.expandirTudo();
  }

  /** Dá o foco do teclado à árvore (na primeira linha, se nenhuma estiver marcada). */
  focar(): void {
    this.arvoreRef()?.nativeElement.focus();
  }

  aoFocarArvore(): void {
    this.arvoreFocada.set(true);
    const linhas = this.linhasVisiveis();
    if (!linhas.some((linha) => linha.id === this.focoId())) this.focoId.set(linhas[0]?.id ?? null);
  }

  /** ↑↓ percorrem as linhas, → abre/entra, ← fecha/sobe. */
  aoTeclarArvore(evento: KeyboardEvent): void {
    if (evento.ctrlKey || evento.metaKey || evento.altKey || evento.shiftKey) return;
    const linhas = this.linhasVisiveis();
    const indice = linhas.findIndex((linha) => linha.id === this.focoId());
    const atual = indice >= 0 ? linhas[indice] : undefined;
    let destino: number | null | undefined;

    switch (evento.key) {
      case 'ArrowDown':
        destino = linhas[Math.min(indice + 1, linhas.length - 1)]?.id;
        break;
      case 'ArrowUp':
        destino = linhas[Math.max(indice - 1, 0)]?.id;
        break;
      case 'ArrowRight':
        if (!atual?.item.filhos.length) return;
        if (!this.expandidos().has(atual.id)) this.alternarExpansao(atual.id);
        else destino = atual.item.filhos[0].id;
        break;
      case 'ArrowLeft':
        if (atual?.item.filhos.length && this.expandidos().has(atual.id)) this.alternarExpansao(atual.id);
        else destino = atual?.paiId;
        break;
      default:
        return;
    }
    evento.preventDefault();
    if (destino) this.marcarFoco(destino);
  }

  marcarFoco(demandaId: number): void {
    this.focoId.set(demandaId);
    setTimeout(() => document.getElementById('demanda-item-' + demandaId)?.scrollIntoView({ block: 'nearest' }));
  }

  /** Troca de status pelo chip: otimista, com rollback se a API recusar (mesmo padrão do Planejamento). */
  aoStatusEscolhido(alteracao: { demandaId: number; de: TipoDemandaStatusEnum; para: TipoDemandaStatusEnum }): void {
    this.statusAlterado.emit({ demandaId: alteracao.demandaId, status: alteracao.para });
    this.demandaService.alterar(alteracao.demandaId, { status: alteracao.para }).subscribe({
      next: (resposta) => {
        if (resposta.sucesso) this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Status alterado' });
      },
      error: () => this.statusAlterado.emit({ demandaId: alteracao.demandaId, status: alteracao.de }),
    });
  }

  private readonly demandaService = inject(DemandaService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  // --- Edição / nova sub-demanda ---
  readonly mostrarDialogEdicao = signal<boolean>(false);
  readonly demandaIdParaEditar = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);

  // --- Tags (menu de contexto; o desenvolvedor só grava nas demandas de que é membro) ---
  readonly tagsDisponiveis = signal<TagResumoDto[]>([]);
  readonly demandaIdTagsEditando = signal<number>(0);
  readonly mostrarDialogTags = signal<boolean>(false);
  readonly carregandoSalvarTags = signal<boolean>(false);
  readonly formularioTags = this.formBuilder.group({
    tagIds: [[] as number[]],
  });

  // --- Membros (gestor-only via context menu) ---
  readonly usuariosDisponiveis = signal<UsuarioResumoDto[]>([]);
  readonly demandaIdMembros = signal<number>(0);
  readonly mostrarDialogMembros = signal<boolean>(false);

  // --- Descrição ---
  readonly campoDescricaoEditando = signal<CampoDescricao | null>(null);
  readonly mostrarDialogDescricao = signal<boolean>(false);
  readonly carregandoSalvarDescricao = signal<boolean>(false);
  readonly demandaIdDescricaoEditando = signal<number>(0);
  readonly nomeDemandaDescricaoEditando = signal<string>('');
  readonly descricaoEditavel = signal<boolean>(false);
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
   * Quem pode editar a descrição aberta: descrição do cliente é exclusiva do gestor;
   * técnica e documentação seguem a editabilidade da demanda (`podeEditar` — membro).
   */
  readonly podeEditarDescricaoAtual = computed(() => {
    const campo = this.campoDescricaoEditando();
    if (!campo) return false;
    if (campo === 'descricaoCliente') return this.sessao.eGestor();
    return this.descricaoEditavel();
  });

  // ---------------------------------------------------------------------------
  // Edição / sub-demanda
  // ---------------------------------------------------------------------------

  abrirEdicao(demandaId: number): void {
    this.demandaIdParaEditar.set(demandaId);
    this.mostrarDialogEdicao.set(true);
  }

  abrirNovaFilha(demandaPaiId: number): void {
    this.demandaPaiIdNovaFilha.set(demandaPaiId);
    this.mostrarDialogNovaFilha.set(true);
  }

  aoDemandaAlterada(): void {
    this.alterado.emit();
  }

  aoDemandaCriada(): void {
    this.alterado.emit();
  }

  // ---------------------------------------------------------------------------
  // Tags
  // ---------------------------------------------------------------------------

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
          if (resposta.sucesso && resposta.dados) this.tagsDisponiveis.set(resposta.dados);
          carregarTagsDemanda();
        },
      });
    }
  }

  salvarTags(): void {
    const idEditando = this.demandaIdTagsEditando();
    if (!idEditando) return;

    const dto: DemandaTagsAtribuirDto = { tagIds: this.formularioTags.value.tagIds ?? [] };

    this.carregandoSalvarTags.set(true);
    this.demandaService
      .alterarTags(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarTags.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tags atualizadas' });
          this.mostrarDialogTags.set(false);
          const tagsAtribuidas = this.tagsDisponiveis().filter((tag) => dto.tagIds.includes(tag.id));
          this.tagsAlteradas.emit({ demandaId: idEditando, tags: tagsAtribuidas });
        },
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

  // ---------------------------------------------------------------------------
  // Membros (gestor-only)
  // ---------------------------------------------------------------------------

  abrirDialogMembros(demandaId: number): void {
    if (!this.sessao.eGestor()) return;
    this.demandaIdMembros.set(demandaId);

    if (this.usuariosDisponiveis().length === 0) {
      this.usuarioService.listar({ itensPorPagina: 100 }).subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            // Gestores não entram no multiselect de membros: têm acesso total a
            // qualquer demanda por serem gestores, sem atribuição em demanda_usuario (task 71).
            this.usuariosDisponiveis.set(
              resposta.dados.itens.filter((usuario) => !temPermissaoDeGestor(usuario.tipo)),
            );
          }
        },
      });
    }

    this.mostrarDialogMembros.set(true);
  }

  // ---------------------------------------------------------------------------
  // Descrição
  // ---------------------------------------------------------------------------

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
          this.alterado.emit();
        },
      });
  }

  aceitarDescricaoAssistente(texto: string): void {
    this.formularioDescricao.patchValue({ valor: texto });
  }
}
