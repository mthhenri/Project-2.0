import { Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmPopupModule } from 'primeng/confirmpopup';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MENSAGEM_CARACTERES_PROIBIDOS, ModelagemGrupoDto, REGEX_SEM_CARACTERES_PROIBIDOS } from '@project20/shared';
import { BloquearCaracteresProibidosDirective } from '../../../../shared/directives/bloquear-caracteres-proibidos.directive';
import { DialogFormularioDirective } from '../../../../shared/directives/dialog-formulario.directive';
import { DialogDicaAtalhosComponent } from '../../../../shared/components/dialog-dica-atalhos/dialog-dica-atalhos.component';
import { ModelagemService } from '../../services/modelagem.service';

/** Resultado do salvamento: o grupo como ficou e se foi criado agora (a tela o acrescenta) ou alterado (a tela o troca). */
export interface GrupoSalvo {
  grupo: ModelagemGrupoDto;
  criado: boolean;
}

/**
 * Cria, renomeia e exclui um grupo do diagrama (só gestor e administrador chegam aqui). O grupo só pode ser excluído vazio: com
 * tabelas, o botão fica desligado e explica que é preciso movê-las antes.
 */
@Component({
  selector: 'app-modelagem-grupo-dialog',
  standalone: true,
  imports: [DialogFormularioDirective, DialogDicaAtalhosComponent, ReactiveFormsModule, ButtonModule, ConfirmPopupModule, DialogModule, InputTextModule, TooltipModule, BloquearCaracteresProibidosDirective],
  providers: [ConfirmationService],
  templateUrl: './modelagem-grupo-dialog.component.html',
  styleUrl: './modelagem-grupo-dialog.component.scss',
})
export class ModelagemGrupoDialogComponent {
  private readonly modelagemService = inject(ModelagemService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  readonly aoSalvar = output<GrupoSalvo>();
  readonly aoExcluir = output<number>();

  private readonly campoTitulo = viewChild<ElementRef<HTMLInputElement>>('campoTitulo');

  readonly mostrarDialog = signal<boolean>(false);
  readonly carregando = signal<boolean>(false);
  /** O grupo em edição; `null` = criando um novo. */
  readonly grupoEmEdicao = signal<ModelagemGrupoDto | null>(null);
  readonly tabelasNoGrupo = signal<number>(0);

  readonly mensagemCaracteresProibidos = MENSAGEM_CARACTERES_PROIBIDOS;

  readonly formulario = this.formBuilder.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(150), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
    rotulo: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)]],
  });

  abrirParaCriar(): void {
    this.grupoEmEdicao.set(null);
    this.tabelasNoGrupo.set(0);
    this.formulario.reset({ titulo: '', rotulo: '' });
    this.mostrarDialog.set(true);
  }

  abrirParaEditar(grupo: ModelagemGrupoDto, tabelasNoGrupo: number): void {
    this.grupoEmEdicao.set(grupo);
    this.tabelasNoGrupo.set(tabelasNoGrupo);
    this.formulario.reset({ titulo: grupo.titulo, rotulo: grupo.rotulo });
    this.mostrarDialog.set(true);
  }

  aoMostrar(): void {
    setTimeout(() => this.campoTitulo()?.nativeElement.select());
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const grupo = this.grupoEmEdicao();
    const valores = this.formulario.getRawValue();
    this.carregando.set(true);
    const chamada = grupo ? this.modelagemService.alterarGrupo(grupo.id, valores) : this.modelagemService.criarGrupo(valores);
    chamada.pipe(finalize(() => this.carregando.set(false))).subscribe({
      next: (resposta) => {
        if (!resposta.dados) return;
        this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
        this.mostrarDialog.set(false);
        this.aoSalvar.emit({ grupo: resposta.dados, criado: !grupo });
      },
    });
  }

  /** Confirmação ancorada no botão (sem dialog por cima do dialog). */
  confirmarExclusao(evento: Event): void {
    const grupo = this.grupoEmEdicao();
    if (!grupo || this.tabelasNoGrupo() > 0) return;
    this.confirmationService.confirm({
      target: evento.currentTarget ?? evento.target ?? undefined,
      message: `Excluir o grupo "${grupo.rotulo}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Excluir',
      rejectLabel: 'Cancelar',
      accept: () => this.excluir(grupo.id),
    });
  }

  private excluir(id: number): void {
    this.carregando.set(true);
    this.modelagemService
      .excluirGrupo(id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          this.messageService.add({ severity: 'success', summary: 'Sucesso', detail: resposta.mensagem });
          this.mostrarDialog.set(false);
          this.aoExcluir.emit(id);
        },
      });
  }

  campoInvalido(nomeCampo: 'titulo' | 'rotulo'): boolean {
    const controle = this.formulario.controls[nomeCampo];
    return controle.invalid && controle.touched;
  }
}
