# 20 — Frontend Core

**Depende de:** 19
**Entrega:** interceptores, guards, auth service, signals e componente assistente

---

## Objetivo

Implementar toda a infraestrutura de cross-cutting concerns do frontend:
autenticação via JWT, interceptores HTTP, guards de rota, estado global com
signals e o componente reutilizável de assistente de IA.

---

## Signals Globais

```typescript
// carregamento.signal.ts
import { signal } from '@angular/core';
export const carregamento = signal<boolean>(false);

// usuario-autenticado.signal.ts
import { signal } from '@angular/core';
import { UsuarioRecuperadoDto } from '@project20/shared';
export const usuarioAutenticado = signal<UsuarioRecuperadoDto | null>(null);
```

---

## Interceptores (funcionais — Angular 21)

### auth-token.interceptor.ts

Adiciona o header `Authorization: Bearer <token>` em toda requisição autenticada.
Token lido do `localStorage` (chave: `access_token`).
Rotas com `/autenticacao/login` não recebem o header.

```typescript
export const authTokenInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  const token = localStorage.getItem('access_token');
  if (!token || requisicao.url.includes('/autenticacao/login')) {
    return proximo(requisicao);
  }
  const requisicaoComToken = requisicao.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });
  return proximo(requisicaoComToken);
};
```

### error-handler.interceptor.ts

Captura erros HTTP e exibe mensagem via PrimeNG `MessageService`.

- **401:** limpar token, redirecionar para `/autenticacao`
- **403:** exibir `'Acesso não permitido'`
- **400:** exibir `erros[0]` ou `mensagem` do corpo da resposta
- **404:** exibir `'Registro não encontrado'`
- **500:** exibir `'Erro interno. Tente novamente.'`

### loading.interceptor.ts

Ativa o signal `carregamento` no início de cada requisição e desativa ao concluir:

```typescript
export const loadingInterceptor: HttpInterceptorFn = (requisicao, proximo) => {
  carregamento.set(true);
  return proximo(requisicao).pipe(
    finalize(() => carregamento.set(false)),
  );
};
```

---

## Guards

### autenticacao.guard.ts

```typescript
export const autenticacaoGuard: CanActivateFn = () => {
  const token = localStorage.getItem('access_token');
  if (token) return true;
  return inject(Router).createUrlTree(['/autenticacao']);
};
```

### gestor.guard.ts

```typescript
export const gestorGuard: CanActivateFn = () => {
  const usuario = usuarioAutenticado();
  if (usuario?.tipo === UsuarioTipoEnum.GESTOR) return true;
  return inject(Router).createUrlTree(['/']);
};
```

---

## Auth Service — `autenticacao.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  login(dto: AutenticacaoLoginDto): Observable<StandardResponse<AutenticacaoTokenDto>> {
    return this.http.post<StandardResponse<AutenticacaoTokenDto>>(
      `${ambiente.apiUrl}/autenticacao/login`,
      dto,
    ).pipe(
      tap((resposta) => {
        if (resposta.sucesso && resposta.dados) {
          localStorage.setItem('access_token', resposta.dados.accessToken);
          usuarioAutenticado.set(resposta.dados.usuario as any);
        }
      }),
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    usuarioAutenticado.set(null);
    this.router.navigate(['/autenticacao']);
  }

  estaAutenticado(): boolean {
    return !!localStorage.getItem('access_token');
  }
}
```

---

## Componentes Shared

### loading-spinner

Exibe um spinner centralizado quando `carregamento()` é true.
Usa `p-progressSpinner` do PrimeNG e o signal `carregamento`.

### error-message

Recebe `@Input() mensagem: string` e exibe com `p-message` do PrimeNG.

### assistente-descricao

Componente reutilizável nos formulários de execução, atividade e demanda:

```typescript
@Component({
  selector: 'app-assistente-descricao',
  standalone: true,
  // ...
})
export class AssistenteDescricaoComponent {
  @Input() textoAtual: string = '';
  @Input() tipoEntidade: 'execucao' | 'atividade' | 'demanda' = 'execucao';
  @Input() contextoEntidade: string = '';
  @Output() textoAuxiliadoAceito = new EventEmitter<string>();

  private readonly http = inject(HttpClient);

  textoAuxiliado = signal<string>('');
  carregandoAuxilio = signal<boolean>(false);
  mostrarComparacao = signal<boolean>(false);

  auxiliar(): void {
    this.carregandoAuxilio.set(true);
    this.http.post<StandardResponse<AssistenteDescricaoAuxiliadaDto>>(
      `${ambiente.apiUrl}/assistente/auxiliar-descricao`,
      {
        textoOriginal: this.textoAtual,
        tipoEntidade: this.tipoEntidade,
        contextoEntidade: this.contextoEntidade,
      },
    ).pipe(finalize(() => this.carregandoAuxilio.set(false)))
    .subscribe((resposta) => {
      if (resposta.sucesso && resposta.dados) {
        this.textoAuxiliado.set(resposta.dados.textoAuxiliado);
        this.mostrarComparacao.set(true);
      }
    });
  }

  aceitar(): void {
    this.textoAuxiliadoAceito.emit(this.textoAuxiliado());
    this.mostrarComparacao.set(false);
  }

  descartar(): void {
    this.textoAuxiliado.set('');
    this.mostrarComparacao.set(false);
  }
}
```

O template exibe o texto original e o auxiliado lado a lado com botões Aceitar/Descartar.
Usa `p-panel` ou `p-card` do PrimeNG para o container de comparação.

---

## NÃO implementar nesta task

- Nenhuma tela de negócio
- Refresh token automático
- Recuperação de senha
- Tema dark/light toggle
