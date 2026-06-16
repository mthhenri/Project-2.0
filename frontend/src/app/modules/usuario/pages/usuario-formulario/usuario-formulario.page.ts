import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { UsuarioCriarDto, UsuarioTipoEnum } from '@project20/shared';
import { UsuarioService } from '../../services/usuario.service';

@Component({
  selector: 'app-usuario-formulario',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, PasswordModule, Select],
  templateUrl: './usuario-formulario.page.html',
  styleUrl: './usuario-formulario.page.scss',
})
export class UsuarioFormularioPage {
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly formBuilder = inject(FormBuilder);

  readonly formulario = this.formBuilder.group({
    login: ['', [Validators.required, Validators.minLength(4)]],
    senhaNaoEncriptada: ['', [Validators.required, Validators.minLength(8)]],
    nomeCompleto: ['', [Validators.required, Validators.minLength(3)]],
    cargoTitulo: ['', [Validators.required]],
    tipo: [null as UsuarioTipoEnum | null, [Validators.required]],
    horasDiariasNecessarias: [8, [Validators.required]],
  });

  readonly carregando = signal<boolean>(false);

  readonly tiposOpcoes = [
    { label: 'Desenvolvedor', value: UsuarioTipoEnum.DESENVOLVEDOR },
    { label: 'Gestor', value: UsuarioTipoEnum.GESTOR },
  ];

  readonly horasOpcoes = Array.from({ length: 12 }, (_, indice) => ({
    label: `${indice + 1} hora${indice > 0 ? 's' : ''}`,
    value: indice + 1,
  }));

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
          this.router.navigate(['/usuario']);
        },
      });
  }

  cancelar(): void {
    this.router.navigate(['/usuario']);
  }

  campoInvalido(nomeCampo: string): boolean {
    const controle = this.formulario.get(nomeCampo);
    return !!(controle?.invalid && controle?.touched);
  }
}
