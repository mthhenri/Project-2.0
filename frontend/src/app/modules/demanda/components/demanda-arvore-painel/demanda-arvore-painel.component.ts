import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { MessageService } from 'primeng/api';
import {
  DemandaArvoreItemDto,
  DemandaAlterarDto,
  DemandaTagsAtribuirDto,
  TagResumoDto,
  UsuarioResumoDto,
} from '@project20/shared';
import { DemandaService } from '../../services/demanda.service';
import { TagService } from '../../../tag/services/tag.service';
import { UsuarioService } from '../../../usuario/services/usuario.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { AssistenteDescricaoComponent } from '../../../../shared/components/assistente-descricao/assistente-descricao.component';
import { DemandaArvoreItemComponent } from '../demanda-arvore-item/demanda-arvore-item.component';
import { DemandaDetalheDialogComponent } from '../demanda-detalhe-dialog/demanda-detalhe-dialog.component';
import { DemandaEdicaoDialogComponent } from '../demanda-edicao-dialog/demanda-edicao-dialog.component';
import { DemandaFormularioDialogComponent } from '../demanda-formulario-dialog/demanda-formulario-dialog.component';
import { DemandaMembroListaComponent } from '../demanda-membro-lista/demanda-membro-lista.component';

type CampoDescricao = 'descricaoTecnica' | 'descricaoCliente' | 'documentacao';

/**
 * Painel reutilizável da árvore de demandas: renderiza os itens e centraliza todos
 * os diálogos disparados pelo context menu (detalhe, edição, nova sub-demanda,
 * tags, membros e descrição). Usado tanto na página de demandas do projeto quanto
 * no detalhe do projeto, evitando duplicação dos handlers e dos diálogos.
 *
 * O host fornece as raízes já montadas e recarrega sua fonte de dados ao receber
 * `alterado`. Para a visualização em grafo (fora da lista), o host pode chamar
 * `abrirDetalhe(id)` via referência de template.
 */
@Component({
  selector: 'app-demanda-arvore-painel',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    EditorModule,
    AssistenteDescricaoComponent,
    DemandaArvoreItemComponent,
    DemandaDetalheDialogComponent,
    DemandaEdicaoDialogComponent,
    DemandaFormularioDialogComponent,
    DemandaMembroListaComponent,
  ],
  templateUrl: './demanda-arvore-painel.component.html',
  styleUrl: './demanda-arvore-painel.component.scss',
})
export class DemandaArvorePainelComponent {
  @Input({ required: true }) raizes: DemandaArvoreItemDto[] = [];
  @Input({ required: true }) projetoId!: number;
  /** Emitido sempre que uma ação altera a árvore (tags, edição, criação, exclusão, descrição). */
  @Output() alterado = new EventEmitter<void>();

  private readonly demandaService = inject(DemandaService);
  private readonly tagService = inject(TagService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);
  readonly sessao = inject(UsuarioSessaoService);

  // --- Detalhe / edição / nova sub-demanda ---
  readonly mostrarDialogDetalhe = signal<boolean>(false);
  readonly demandaIdSelecionada = signal<number>(0);
  readonly mostrarDialogEdicao = signal<boolean>(false);
  readonly demandaIdParaEditar = signal<number>(0);
  readonly mostrarDialogNovaFilha = signal<boolean>(false);
  readonly demandaPaiIdNovaFilha = signal<number>(0);

  // --- Tags (gestor-only via context menu) ---
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
  // Detalhe / edição / sub-demanda
  // ---------------------------------------------------------------------------

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

  aoDemandaAlterada(): void {
    this.alterado.emit();
  }

  aoDemandaCriada(): void {
    this.alterado.emit();
  }

  aoDemandaExcluida(): void {
    this.alterado.emit();
  }

  // ---------------------------------------------------------------------------
  // Tags (gestor-only)
  // ---------------------------------------------------------------------------

  abrirDialogTagsPorId(demandaId: number): void {
    if (!this.sessao.eGestor()) return;
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
          this.alterado.emit();
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
          if (resposta.sucesso && resposta.dados) this.usuariosDisponiveis.set(resposta.dados.itens);
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
        this.mostrarDialogDescricao.set(true);
      },
    });
  }

  salvarDescricao(): void {
    const campo = this.campoDescricaoEditando();
    const idEditando = this.demandaIdDescricaoEditando();
    if (!campo || !idEditando || !this.podeEditarDescricaoAtual()) return;

    this.carregandoSalvarDescricao.set(true);
    const dto = { [campo]: this.formularioDescricao.value.valor ?? undefined } as DemandaAlterarDto;

    this.demandaService
      .alterar(idEditando, dto)
      .pipe(finalize(() => this.carregandoSalvarDescricao.set(false)))
      .subscribe({
        next: () => {
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
