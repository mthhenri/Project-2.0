import { Component, inject, signal, effect, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { EditorModule } from 'primeng/editor';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-anotacoes-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, EditorModule, ConfirmDialogModule],
  templateUrl: './usuario-anotacoes-dialog.component.html',
  styleUrl: './usuario-anotacoes-dialog.component.scss',
  providers: [ConfirmationService],
})
export class UsuarioAnotacoesDialogComponent implements OnDestroy {
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);

  readonly visivel = signal(false);
  readonly carregando = signal(false);
  readonly carregandoSalvar = signal(false);

  private readonly usuarioId = signal(0);
  private readonly nomeCompletoUsuario = signal('');

  readonly formulario = this.formBuilder.group({
    anotacoes: [''],
  });

  private autoSaveSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      if (this.visivel()) {
        this.autoSaveSubscription = interval(30000).subscribe(() => this.salvarSilencioso());
      } else {
        this.autoSaveSubscription?.unsubscribe();
        this.autoSaveSubscription = null;
      }
    });
  }

  tituloDialog(): string {
    return `Anotações — ${this.nomeCompletoUsuario()}`;
  }

  abrir(usuarioId: number, nomeCompleto: string): void {
    this.usuarioId.set(usuarioId);
    this.nomeCompletoUsuario.set(nomeCompleto);
    this.carregarAnotacoes();
    this.visivel.set(true);
  }

  salvar(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.carregandoSalvar.set(true);
    this.usuarioService
      .alterar(id, { anotacoes: this.formulario.value.anotacoes ?? '' })
      .pipe(finalize(() => this.carregandoSalvar.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Salvo',
            detail: 'Anotações salvas com sucesso',
          });
        },
      });
  }

  limpar(): void {
    this.confirmationService.confirm({
      key: 'anotacoes-limpar',
      message: 'Deseja apagar todas as anotações? Esta ação não pode ser desfeita.',
      header: 'Limpar anotações',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Limpar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.formulario.patchValue({ anotacoes: '' });
        this.salvar();
      },
    });
  }

  ngOnDestroy(): void {
    this.autoSaveSubscription?.unsubscribe();
  }

  private salvarSilencioso(): void {
    const id = this.usuarioId();
    if (!id || this.carregandoSalvar()) return;
    this.usuarioService
      .alterar(id, { anotacoes: this.formulario.value.anotacoes ?? '' })
      .subscribe();
  }

  private carregarAnotacoes(): void {
    const id = this.usuarioId();
    if (!id) return;

    this.carregando.set(true);
    this.usuarioService
      .recuperar(id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => {
          if (resposta.sucesso && resposta.dados) {
            this.formulario.patchValue({ anotacoes: resposta.dados.anotacoes ?? '' });
          }
        },
      });
  }
}
