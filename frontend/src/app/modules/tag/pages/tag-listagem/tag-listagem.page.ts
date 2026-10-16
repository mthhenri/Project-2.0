import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import {
  TagResumoDto,
  TagCriarDto,
  TagAlterarDto,
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '@project20/shared';
import { TagService } from '../../services/tag.service';
import { SkeletonListaComponent } from '../../../../shared/components/skeleton-lista/skeleton-lista.component';
import { BarraRecargaComponent } from '../../../../shared/components/barra-recarga/barra-recarga.component';
import { SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { DesfazerService } from '../../../../core/services/desfazer.service';

@Component({
  selector: 'app-tag-listagem',
  standalone: true,
  imports: [
    DialogFormularioDirective,
    DialogDicaAtalhosComponent,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    DialogModule,
    TooltipModule,
    SeletorCorComponent,
    SkeletonListaComponent,
    BarraRecargaComponent,
    BloquearCaracteresProibidosDirective,
  ],
  templateUrl: './tag-listagem.page.html',
  styleUrl: './tag-listagem.page.scss',
})
export class TagListagemPage implements OnInit {
  private readonly tagService = inject(TagService);
  private readonly messageService = inject(MessageService);
  private readonly desfazerService = inject(DesfazerService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tags = signal<TagResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  private readonly jaCarregou = signal<boolean>(false);
  readonly primeiraCarga = computed(() => this.carregando() && !this.jaCarregou());
  readonly recarregando = computed(() => this.carregando() && this.jaCarregou());
  readonly mostrarDialogNova = signal<boolean>(false);
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);
  readonly tagEmEdicao = signal<TagResumoDto | null>(null);

  readonly formularioNova = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    cor:  ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  readonly formularioEditar = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    cor:  ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  ngOnInit(): void {
    this.buscarTags();
  }

  buscarTags(): void {
    this.carregando.set(true);
    this.tagService
      .listar()
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.jaCarregou.set(true);
      }))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.tags.set(resposta.dados);
          }
        },
      });
  }

  abrirDialogNova(): void {
    this.formularioNova.reset({ nome: '', cor: '#3b82f6' });
    this.mostrarDialogNova.set(true);
  }

  salvarNova(): void {
    if (this.formularioNova.invalid) {
      this.formularioNova.markAllAsTouched();
      return;
    }

    const dto: TagCriarDto = {
      nome: this.formularioNova.value.nome!,
      cor:  this.formularioNova.value.cor!,
    };

    this.carregandoSalvar.set(true);
    this.tagService
      .criar(dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `Tag "${dto.nome}" criada com sucesso`,
          });
          this.mostrarDialogNova.set(false);
          if (resposta.dados) this.inserirTag(resposta.dados);
        },
      });
  }

  abrirDialogEditar(tag: TagResumoDto): void {
    this.tagEmEdicao.set(tag);
    this.formularioEditar.patchValue({ nome: tag.nome, cor: tag.cor });
    this.mostrarDialogEditar.set(true);
  }

  salvarEdicao(): void {
    if (this.formularioEditar.invalid) {
      this.formularioEditar.markAllAsTouched();
      return;
    }

    const tag = this.tagEmEdicao();
    if (!tag) return;

    const dto: TagAlterarDto = {
      nome: this.formularioEditar.value.nome ?? undefined,
      cor:  this.formularioEditar.value.cor ?? undefined,
    };

    this.carregandoSalvar.set(true);
    this.tagService
      .alterar(tag.id, dto)
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Tag alterada com sucesso',
          });
          this.mostrarDialogEditar.set(false);
          if (resposta.dados) this.substituirTag(resposta.dados);
        },
      });
  }

  /** Exclusão imediata (task 99): a tag sai da lista na hora e o toast oferece "Desfazer". */
  excluir(tag: TagResumoDto): void {
    const listaAnterior = this.tags();
    this.tags.update((lista) => lista.filter((item) => item.id !== tag.id));

    this.tagService.excluir(tag.id).subscribe({
      next: () =>
        this.desfazerService.oferecer({
          mensagem: `Tag "${tag.nome}" excluída`,
          desfazer: () => this.tagService.restaurar(tag.id),
          aposDesfazer: () => this.inserirTag(tag),
        }),
      error: () => this.tags.set(listaAnterior),
    });
  }

  campoNovaInvalido(nomeCampo: string): boolean {
    const controle = this.formularioNova.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  campoEditarInvalido(nomeCampo: string): boolean {
    const controle = this.formularioEditar.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  /** A listagem é ordenada por nome no servidor; a inserção local mantém a mesma ordem. */
  private inserirTag(tag: TagResumoDto): void {
    this.tags.update((lista) =>
      [...lista, { id: tag.id, nome: tag.nome, cor: tag.cor }].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    );
  }

  private substituirTag(tag: TagResumoDto): void {
    this.tags.update((lista) =>
      lista
        .map((item) => (item.id === tag.id ? { id: tag.id, nome: tag.nome, cor: tag.cor } : item))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    );
  }
}
