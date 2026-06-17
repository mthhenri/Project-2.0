import { Component, inject, signal, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TagResumoDto, TagCriarDto, TagAlterarDto } from '@project20/shared';
import { TagService } from '../../services/tag.service';

@Component({
  selector: 'app-tag-listagem',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    ColorPickerModule,
    DialogModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  templateUrl: './tag-listagem.page.html',
  styleUrl: './tag-listagem.page.scss',
  providers: [ConfirmationService],
})
export class TagListagemPage implements OnInit {
  private readonly tagService = inject(TagService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  readonly tags = signal<TagResumoDto[]>([]);
  readonly carregando = signal<boolean>(false);
  readonly mostrarDialogNova = signal<boolean>(false);
  readonly mostrarDialogEditar = signal<boolean>(false);
  readonly carregandoSalvar = signal<boolean>(false);
  readonly tagEmEdicao = signal<TagResumoDto | null>(null);

  readonly formularioNova = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(100)]],
    cor:  ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  readonly formularioEditar = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(100)]],
    cor:  ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  ngOnInit(): void {
    this.buscarTags();
  }

  buscarTags(): void {
    this.carregando.set(true);
    this.tagService
      .listar()
      .pipe(finalize(() => this.carregando.set(false)))
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
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: `Tag "${dto.nome}" criada com sucesso`,
          });
          this.mostrarDialogNova.set(false);
          this.buscarTags();
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
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Tag alterada com sucesso',
          });
          this.mostrarDialogEditar.set(false);
          this.buscarTags();
        },
      });
  }

  confirmarExclusao(tag: TagResumoDto): void {
    this.confirmationService.confirm({
      message: `Deseja excluir a tag "${tag.nome}"? Esta ação não pode ser desfeita.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.excluirTag(tag),
    });
  }

  digitarCor(evento: Event, controle: AbstractControl | null): void {
    if (!controle) return;
    const valor = (evento.target as HTMLInputElement).value.trim();
    const hexNormalizado = valor.startsWith('#') ? valor : '#' + valor;
    if (/^#[0-9A-Fa-f]{6}$/.test(hexNormalizado)) {
      controle.setValue(hexNormalizado);
    }
  }

  campoNovaInvalido(nomeCampo: string): boolean {
    const controle = this.formularioNova.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  campoEditarInvalido(nomeCampo: string): boolean {
    const controle = this.formularioEditar.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }

  private excluirTag(tag: TagResumoDto): void {
    this.tagService.excluir(tag.id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Tag "${tag.nome}" excluída com sucesso`,
        });
        this.buscarTags();
      },
    });
  }
}
