import { Component, inject, signal, OnInit } from '@angular/core';
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
export class LoginPage implements OnInit {
  private readonly autenticacaoService = inject(AutenticacaoService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly CHAVE_ULTIMO_LOGIN = 'ultimo_login';

  readonly formulario = this.formBuilder.group({
    login: ['', [Validators.required, Validators.minLength(4)]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly carregando    = signal<boolean>(false);
  readonly erroLogin     = signal<string>('');
  readonly temLoginSalvo = signal<boolean>(false);

  ngOnInit(): void {
    const salvo = localStorage.getItem(this.CHAVE_ULTIMO_LOGIN);
    if (salvo) {
      try {
        const { login, senha } = JSON.parse(salvo);
        this.formulario.patchValue({ login, senha });
        this.temLoginSalvo.set(true);
      } catch {
        localStorage.removeItem(this.CHAVE_ULTIMO_LOGIN);
      }
    }
  }

  entrar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erroLogin.set('');

    const loginValor = this.formulario.value.login!;
    const senhaValor = this.formulario.value.senha!;

    this.autenticacaoService
      .login(this.formulario.value as AutenticacaoLoginDto)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: () => {
          this.salvarUltimoLogin(loginValor, senhaValor);
          this.router.navigate(['/atividade']);
        },
        error: (erro) => this.erroLogin.set(erro.error?.mensagem ?? 'Credenciais inválidas'),
      });
  }

  esquecerLogin(): void {
    localStorage.removeItem(this.CHAVE_ULTIMO_LOGIN);
    this.formulario.reset();
    this.temLoginSalvo.set(false);
  }

  private salvarUltimoLogin(login: string, senha: string): void {
    localStorage.setItem(this.CHAVE_ULTIMO_LOGIN, JSON.stringify({ login, senha }));
    this.temLoginSalvo.set(true);
  }
}
