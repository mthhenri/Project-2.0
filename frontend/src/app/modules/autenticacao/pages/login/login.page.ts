import { Component, ElementRef, afterNextRender, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageModule } from 'primeng/message';
import { AutenticacaoService } from '../../../../core/services/autenticacao.service';
import { TemaService } from '../../../../core/services/tema.service';
import { UsuarioSessaoService } from '../../../../core/services/usuario-sessao.service';
import { IaDisponibilidadeService } from '../../../../core/services/ia-disponibilidade.service';
import { destinoPosLogin } from '../../../../core/utils/destino-pos-login';
import { urlRetornoSegura } from '../../../../core/utils/url-retorno';
import { AutenticacaoLoginDto } from '@project20/shared';

/** Só o login e o nome ficam no navegador — a senha nunca é persistida (task 94). */
interface UsuarioLembrado {
  login: string;
  nomeCompleto: string;
}

const CHAVE_ULTIMO_LOGIN = 'ultimo_login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CardModule, InputTextModule, PasswordModule, ButtonModule, CheckboxModule, MessageModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
})
export class LoginPage implements OnInit {
  private readonly autenticacaoService = inject(AutenticacaoService);
  private readonly sessao = inject(UsuarioSessaoService);
  private readonly router = inject(Router);
  private readonly iaDisponibilidade = inject(IaDisponibilidadeService);
  private readonly rotaAtiva = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly tema = inject(TemaService);

  readonly formulario = this.formBuilder.group({
    login:  ['', [Validators.required, Validators.minLength(4)]],
    senha:  ['', [Validators.required]],
    lembrar: [true],
  });

  readonly carregando = signal<boolean>(false);
  readonly erroLogin = signal<string>('');
  readonly capsLockAtivo = signal<boolean>(false);
  readonly usuarioLembrado = signal<UsuarioLembrado | null>(null);
  private readonly usandoOutroUsuario = signal<boolean>(false);

  /** Estado A (usuário lembrado, só a senha) ou B (formulário completo). */
  readonly modoLembrado = computed(() => this.usuarioLembrado() !== null && !this.usandoOutroUsuario());
  readonly iniciais = computed(() =>
    (this.usuarioLembrado()?.nomeCompleto ?? '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase(),
  );

  constructor() {
    afterNextRender(() => this.focarCampoInicial());
  }

  ngOnInit(): void {
    this.lerUsuarioLembrado();
    const lembrado = this.usuarioLembrado();
    if (lembrado) this.formulario.patchValue({ login: lembrado.login });

    // Digitar de novo apaga o erro da tentativa anterior.
    this.formulario.valueChanges.subscribe(() => {
      if (this.erroLogin()) this.erroLogin.set('');
    });
  }

  entrar(): void {
    if (this.carregando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.normalizarLogin();
    const { login, senha, lembrar } = this.formulario.getRawValue();
    this.carregando.set(true);
    this.erroLogin.set('');
    this.formulario.disable({ emitEvent: false });

    this.autenticacaoService
      .login({ login, senha } as AutenticacaoLoginDto)
      .pipe(finalize(() => {
        this.carregando.set(false);
        this.formulario.enable({ emitEvent: false });
      }))
      .subscribe({
        next: () => {
          this.guardarUsuarioLembrado(!!lembrar);
          const retorno = urlRetornoSegura(this.router, this.rotaAtiva.snapshot.queryParamMap.get('returnUrl'));
          // Com a IA no ar o login cai no chat; senão, no fluxo convencional (a consulta já vai com o token novo).
          this.iaDisponibilidade.consultar().subscribe((estado) => this.router.navigateByUrl(destinoPosLogin(retorno, estado)));
        },
        error: (erro: HttpErrorResponse) => this.aoFalhar(erro),
      });
  }

  /** Troca para o formulário completo sem apagar o usuário lembrado (só o próximo sucesso o sobrescreve). */
  entrarComOutroUsuario(): void {
    this.usandoOutroUsuario.set(true);
    this.erroLogin.set('');
    this.formulario.reset({ login: '', senha: '', lembrar: true });
    setTimeout(() => this.campo('#login-input')?.focus());
  }

  /** Espelha o `@Transform` do backend: trim + minúsculas. */
  normalizarLogin(): void {
    const controle = this.formulario.controls.login;
    const normalizado = (controle.value ?? '').trim().toLowerCase();
    if (normalizado !== controle.value) controle.setValue(normalizado);
  }

  atualizarCapsLock(evento: KeyboardEvent): void {
    if (typeof evento.getModifierState === 'function') {
      this.capsLockAtivo.set(evento.getModifierState('CapsLock'));
    }
  }

  private aoFalhar(erro: HttpErrorResponse): void {
    if (erro.status === 0 || erro.status >= 500) {
      this.erroLogin.set('Servidor indisponível. Tente novamente em instantes.');
      return;
    }
    this.erroLogin.set(erro.error?.mensagem ?? 'Credenciais inválidas');
    // O formulário volta a ficar habilitado no finalize; foca depois disso.
    setTimeout(() => {
      const senha = this.campo('input[type=password], #senha-input') as HTMLInputElement | null;
      senha?.focus();
      senha?.select();
    });
  }

  private focarCampoInicial(): void {
    this.campo(this.modoLembrado() ? '#senha-input' : '#login-input')?.focus();
  }

  private campo(seletor: string): HTMLInputElement | null {
    return this.elemento.nativeElement.querySelector<HTMLInputElement>(seletor);
  }

  private lerUsuarioLembrado(): void {
    const salvo = localStorage.getItem(CHAVE_ULTIMO_LOGIN);
    if (!salvo) return;
    try {
      const dados = JSON.parse(salvo) as Partial<UsuarioLembrado> & { senha?: string };
      // Formato antigo guardava a senha: some na hora, sem reaproveitar nada.
      if (dados.senha !== undefined || !dados.login || !dados.nomeCompleto) {
        localStorage.removeItem(CHAVE_ULTIMO_LOGIN);
        return;
      }
      this.usuarioLembrado.set({ login: dados.login, nomeCompleto: dados.nomeCompleto });
    } catch {
      localStorage.removeItem(CHAVE_ULTIMO_LOGIN);
    }
  }

  private guardarUsuarioLembrado(lembrar: boolean): void {
    const nomeCompleto = this.sessao.nomeCompleto();
    const login = this.sessao.login();
    if (lembrar && nomeCompleto && login) {
      localStorage.setItem(CHAVE_ULTIMO_LOGIN, JSON.stringify({ login, nomeCompleto }));
    } else {
      localStorage.removeItem(CHAVE_ULTIMO_LOGIN);
    }
  }
}
