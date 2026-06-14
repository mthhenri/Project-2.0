# 19 — Frontend Scaffold

**Depende de:** 00, 01
**Entrega:** projeto Angular 21 configurado com PrimeNG, Tailwind, SCSS e estrutura de pastas

---

## Objetivo

Criar o projeto Angular 21 em `frontend/` com PrimeNG 21, Tailwind CSS, SCSS e estrutura
de pastas conforme SYSTEM.SPEC.md. Toda estilização usa **SCSS** (nunca `.css`), utilitários
de layout e espaçamento via **Tailwind**, e classes customizadas seguindo **BEM**
(`bloco__elemento--modificador`). Nenhuma tela de negócio implementada — apenas o esqueleto.

---

## Dependências a Instalar

```bash
# Angular + PrimeNG
npm install @angular/core@21 @angular/common@21 @angular/forms@21 @angular/router@21
npm install primeng@21 @primeng/themes primeicons
npm install @project20/shared

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init

# Grafo Obsidian-like
npm install d3
npm install -D @types/d3
```

---

## Estrutura a Criar

```
frontend/
  package.json
  tsconfig.json
  tsconfig.app.json
  angular.json
  tailwind.config.js       ← configuração do Tailwind
  src/
    index.html
    main.ts
    styles.scss            ← diretivas Tailwind + variáveis globais
    app/
      app.config.ts
      app.routes.ts
      app.component.ts
      app.component.html
      modules/
        usuario/
          components/
          pages/
          services/
            usuario.service.ts      ← esqueleto
          models/
            usuario.model.ts        ← esqueleto
        projeto/          ← esqueleto
        demanda/          ← esqueleto
        atividade/        ← esqueleto
        execucao/         ← esqueleto
        ponto/            ← esqueleto
        calendario/       ← esqueleto
        tag/              ← esqueleto
      core/
        services/
          autenticacao.service.ts   ← esqueleto
        interceptors/
          auth-token.interceptor.ts ← esqueleto
          error-handler.interceptor.ts ← esqueleto
          loading.interceptor.ts    ← esqueleto
        guards/
          autenticacao.guard.ts     ← esqueleto
          gestor.guard.ts           ← esqueleto
        signals/
          carregamento.signal.ts    ← esqueleto
          usuario-autenticado.signal.ts ← esqueleto
      shared/
        components/
          loading-spinner/
            loading-spinner.component.ts
            loading-spinner.component.html
          error-message/
            error-message.component.ts
            error-message.component.html
          assistente-descricao/
            assistente-descricao.component.ts ← esqueleto
        pipes/
          data-brasileira.pipe.ts
          minutos-para-horas.pipe.ts
        layout/
          layout.component.ts
          layout.component.html
          topbar/
            topbar.component.ts
            topbar.component.html
          sidebar/
            sidebar.component.ts
            sidebar.component.html
    environments/
      environment.ts
      environment.production.ts
```

---

## Implementação

### package.json

```json
{
  "name": "frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "ng serve --proxy-config proxy.conf.json",
    "build": "ng build"
  },
  "dependencies": {
    "@project20/shared": "*"
  }
}
```

### proxy.conf.json

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false
  }
}
```

### tailwind.config.js

```javascript
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: { extend: {} },
  plugins: [],
};
```

### styles.scss

```scss
// Diretivas Tailwind — ordem obrigatória
@tailwind base;
@tailwind components;
@tailwind utilities;

// Variáveis SCSS globais do projeto
$espacamento-base: 1rem;
$raio-borda-padrao: 0.5rem;
```

---

## Convenção de Estilos — SCSS + Tailwind + BEM

**Regra geral:** Tailwind para tudo que é layout e utilitário; BEM em SCSS para classes
customizadas com lógica de estado ou estrutura complexa.

```html
<!-- ✅ Tailwind para layout/espaçamento -->
<div class="flex items-center gap-4 p-6">
  <!-- ✅ BEM para classes de componente com semântica -->
  <div class="usuario-cartao usuario-cartao--inativo">
    <span class="usuario-cartao__nome">João Silva</span>
    <span class="usuario-cartao__cargo">Dev Sênior</span>
  </div>
</div>
```

```scss
// usuario-cartao.component.scss
.usuario-cartao {
  // estrutura do bloco

  &__nome {
    // estilo do elemento nome
  }

  &__cargo {
    // estilo do elemento cargo
  }

  &--inativo {
    // modificador: cartão de usuário inativo
    opacity: 0.5;
  }
}
```

**Regras:**
- Todo arquivo de estilo tem extensão `.scss` — nunca `.css`
- Nunca usar `style=""` inline no HTML
- Nunca usar seletores de ID em SCSS
- Classes BEM sempre em português (negócio): `.usuario-cartao`, `.demanda-arvore-item`
- Utilitários Tailwind sem prefixo customizado — usar as classes padrão da lib

### environments/environment.ts

```typescript
export const ambiente = {
  producao: false,
  apiUrl: '/api/v1',
};
```

### app.config.ts

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { rotas } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';
import { errorHandlerInterceptor } from './core/interceptors/error-handler.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(rotas, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        authTokenInterceptor,
        errorHandlerInterceptor,
        loadingInterceptor,
      ]),
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: { preset: Aura, options: { darkModeSelector: false } },
    }),
  ],
};
```

### app.routes.ts

```typescript
import { Routes } from '@angular/router';
import { autenticacaoGuard } from './core/guards/autenticacao.guard';
import { LayoutComponent } from './shared/layout/layout.component';

export const rotas: Routes = [
  {
    path: 'autenticacao',
    loadComponent: () =>
      import('./modules/autenticacao/pages/login/login.page').then(
        (modulo) => modulo.LoginPage,
      ),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [autenticacaoGuard],
    children: [
      { path: 'usuario',    loadChildren: () => import('./modules/usuario/usuario.routes').then((m) => m.usuarioRotas) },
      { path: 'projeto',    loadChildren: () => import('./modules/projeto/projeto.routes').then((m) => m.projetoRotas) },
      { path: 'demanda',    loadChildren: () => import('./modules/demanda/demanda.routes').then((m) => m.demandaRotas) },
      { path: 'atividade',  loadChildren: () => import('./modules/atividade/atividade.routes').then((m) => m.atividadeRotas) },
      { path: 'execucao',   loadChildren: () => import('./modules/execucao/execucao.routes').then((m) => m.execucaoRotas) },
      { path: 'ponto',      loadChildren: () => import('./modules/ponto/ponto.routes').then((m) => m.pontoRotas) },
      { path: 'calendario', loadChildren: () => import('./modules/calendario/calendario.routes').then((m) => m.calendarioRotas) },
      { path: 'tag',        loadChildren: () => import('./modules/tag/tag.routes').then((m) => m.tagRotas) },
      { path: '', redirectTo: 'ponto', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'autenticacao' },
];
```

### Layout

O `LayoutComponent` é um wrapper com topbar e sidebar usando PrimeNG.
Sidebar com itens de navegação para cada módulo.
Topbar com nome do usuário logado e botão de logout.

### Pipes

```typescript
// data-brasileira.pipe.ts — formata Date para dd/MM/yyyy
// minutos-para-horas.pipe.ts — converte 125 para '2h 5min'
```

---

## NÃO implementar nesta task

- Nenhuma tela de negócio
- Nenhuma lógica de autenticação real
- Guards e interceptores são esqueletos vazios
- Serviços são esqueletos com apenas a injeção do HttpClient
