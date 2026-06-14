# 21 — Frontend Auth

**Depende de:** 20
**Entrega:** tela de login funcional

---

## Objetivo

Única tela pública da aplicação. Formulário de login com validação,
integração com `AutenticacaoService` e redirecionamento pós-login.

---

## Arquivos a Criar

```
frontend/src/app/modules/autenticacao/
  pages/
    login/
      login.page.ts
      login.page.html
      login.page.scss
```

---

## login.page.ts

```typescript
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, /* PrimeNG components */],
})
export class LoginPage {
  private readonly autenticacaoService = inject(AutenticacaoService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);

  formulario = this.formBuilder.group({
    login: ['', [Validators.required, Validators.minLength(4)]],
    senha: ['', [Validators.required, Validators.minLength(8)]],
  });

  carregando = signal<boolean>(false);
  erroLogin = signal<string>('');

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
        next: () => this.router.navigate(['/']),
        error: (erro) => this.erroLogin.set(erro.error?.mensagem ?? 'Credenciais inválidas'),
      });
  }
}
```

---

## login.page.html

Usar componentes PrimeNG:
- `p-card` para o container do formulário (centralizado na tela)
- `p-inputtext` para os campos
- `p-password` para o campo de senha (sem medidor de força)
- `p-button` para o botão de entrar com `[loading]="carregando()"`
- `p-message` para exibir `erroLogin()` quando preenchido

Validação inline nos campos:
- Login: obrigatório, mínimo 4 caracteres
- Senha: obrigatório, mínimo 8 caracteres
- Mensagens de erro exibidas apenas após o campo ser tocado (`touched`)

---

## Redirect pós-login

Após login bem-sucedido, redirecionar para `/ponto` (painel de ponto diário).
Se usuário tentar acessar `/autenticacao` já logado, redirecionar para `/`.

Atualizar `autenticacao.guard.ts` para verificar se já está logado
e redirecionar para `/` se tentar acessar `/autenticacao`.

---

## NÃO implementar nesta task

- Registro de novos usuários (feito pelo gestor no módulo usuario)
- "Lembrar senha" / remember me
- Recuperação de senha
