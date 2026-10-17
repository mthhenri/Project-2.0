import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { TagResumoDto, TagAlteradaDto, REGEX_SEM_CARACTERES_PROIBIDOS, MENSAGEM_CARACTERES_PROIBIDOS } from '@project20/shared';
import { TagService } from '../../services/tag.service';
import { estiloPillTag } from '../../utils/tag.util';
import { SeletorCorComponent } from '../../../../shared/components/seletor-cor/seletor-cor.component';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';

/** Edição de uma tag (task 116): prévia permanente, nome já selecionado e paleta compacta. Criar é pelo quick-add. */
@Component({
  selector: 'app-tag-edicao-dialog',
  standalone: true,
  imports: [DialogFormularioDirective, DialogDicaAtalhosComponent, ReactiveFormsModule, ButtonModule, InputTextModule, DialogModule, SeletorCorComponent, BloquearCaracteresProibidosDirective],
  templateUrl: './tag-edicao-dialog.component.html',
  styleUrl: './tag-edicao-dialog.component.scss',
})
export class TagEdicaoDialogComponent {
  private readonly tagService = inject(TagService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  /** Emitido com a tag salva; a listagem a troca no signal, sem refetch. */
  readonly aoSalvar = output<TagAlteradaDto>();

  private readonly campoNome = viewChild<ElementRef<HTMLInputElement>>('campoNome');

  readonly mostrarDialog = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);
  private tagEmEdicao: TagResumoDto | null = null;

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;
  readonly estiloPillTag = estiloPillTag;

  readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    cor: ['#3b82f6', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  abrir(tag: TagResumoDto): void {
    this.tagEmEdicao = tag;
    this.formulario.reset({ nome: tag.nome, cor: tag.cor });
    this.mostrarDialog.set(true);
  }

  /** O nome já abre selecionado: digitar substitui, Enter confirma. */
  aoMostrar(): void {
    setTimeout(() => this.campoNome()?.nativeElement.select());
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const tag = this.tagEmEdicao;
    if (!tag) return;

    this.carregando.set(true);
    this.tagService
      .alterar(tag.id, this.formulario.getRawValue())
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: 'Tag alterada com sucesso' });
          this.mostrarDialog.set(false);
          if (resposta.dados) this.aoSalvar.emit(resposta.dados);
        },
      });
  }

  campoInvalido(nomeCampo: 'nome' | 'cor'): boolean {
    const controle = this.formulario.controls[nomeCampo];
    return controle.invalid && controle.touched;
  }
}
