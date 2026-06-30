import { Component, inject, signal, output } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Select } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { UsuarioCriarDto, TipoUsuarioEnum } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-formulario-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, Select, InputNumberModule, DialogModule],
  templateUrl: './usuario-formulario-dialog.component.html',
  styleUrl: './usuario-formulario-dialog.component.scss',
})
export class UsuarioFormularioDialogComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  /** Emitido quando um usuário é criado com sucesso, para a listagem recarregar. */
  readonly aoCriar = output<void>();

  readonly formulario = this.formBuilder.group({
    login: ['', [Validators.required, Validators.minLength(4)]],
    senhaNaoEncriptada: ['', [Validators.required, Validators.minLength(8)]],
    nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
    cargoTitulo: ['', [Validators.required]],
    tipo: [null as TipoUsuarioEnum | null, [Validators.required]],
    horasDiariasNecessarias: [8, [Validators.required]],
  });

  readonly carregando = signal<boolean>(false);
  readonly mostrarDialog = signal<boolean>(false);

  readonly tiposOpcoes = [
    { label: 'Desenvolvedor', value: TipoUsuarioEnum.DESENVOLVEDOR },
    { label: 'Gestor', value: TipoUsuarioEnum.GESTOR },
  ];

  /** Abre o dialog com o formulário limpo. */
  abrir(): void {
    this.formulario.reset({ horasDiariasNecessarias: 8, tipo: null });
    this.mostrarDialog.set(true);
  }

  salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.carregando.set(true);

    this.usuarioService
      .criar(this.formulario.value as UsuarioCriarDto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Sucesso',
            detail: 'Usuário criado com sucesso',
          });
          this.mostrarDialog.set(false);
          this.aoCriar.emit();
        },
      });
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }
}
