import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AutenticacaoService } from '../../../../core/services/autenticacao.service';
import { AutenticacaoLoginDto } from '@project20/shared';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage {
  private readonly autenticacaoService = inject(AutenticacaoService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  readonly formulario = this.formBuilder.group({
    login: ['', [Validators.required, Validators.minLength(4)]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly carregando = signal<boolean>(false);
  readonly erroLogin = signal<string>('');

  entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erroLogin.set('');

    this.autenticacaoService
      .login(this.formulario.value as AutenticacaoLoginDto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/ponto']),
        error: (erro) => this.erroLogin.set(erro.error?.mensagem ?? 'Credenciais inválidas'),
      });
  }
}
