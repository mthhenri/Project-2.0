# 45 — Frontend: Tema Escuro do Sistema

**Depende de:** 21 (frontend-scaffold), 22 (frontend-core)
**Entrega:** o sistema passa a oferecer um **tema escuro** que o usuário liga/desliga a partir do **popover de perfil da topbar** (o aberto pelo botão de usuário); a escolha é **persistida no `localStorage`** e reaplicada automaticamente em toda recarga/abertura do app, sem "piscar" o tema claro antes de trocar.

> Frontend apenas. Sem backend, sem mudança de DTO/endpoint, sem migration. A preferência é **por dispositivo/navegador** (`localStorage`), não um campo do usuário no banco.

---

## Contexto

O tema do PrimeNG é configurado em [app.config.ts](../../../frontend/src/app/app.config.ts) via `providePrimeNG`,
hoje com **modo escuro desativado**:

```typescript
providePrimeNG({
  theme: { preset: TemaAzul, options: { darkModeSelector: false } },
}),
```

Com `darkModeSelector: false`, o PrimeNG nunca gera as variáveis do modo escuro. O preset `Aura`
(`@primeng/themes`) já suporta dark mode — basta apontar o `darkModeSelector` para um **seletor de
classe** e alternar essa classe no elemento raiz (`<html>`) para o app inteiro trocar de tema. Os
componentes do projeto usam tokens `surface-*` e `var(--p-*)` (ver [CONVENTIONS.md](../../CONVENTIONS.md)
seção *Estilos*), portanto a maior parte da UI acompanha o tema automaticamente quando a classe é alternada.

A opção de tema deve aparecer no **popover de perfil da topbar** —
[topbar.component.html](../../../frontend/src/app/shared/layout/topbar/topbar.component.html),
o `p-popover #perfilPopover` aberto pelo botão `pi pi-user`, que hoje exibe nome, login, cargo e o
link "Minhas Anotações". É um menu por sessão (sempre o usuário logado), então é o lugar natural para
uma preferência de aparência do dispositivo.

Convenção de persistência local já praticada no projeto: o token de autenticação usa
`localStorage` com a chave `access_token` (ver `AutenticacaoService` em
[core/services](../../../frontend/src/app/core/services/autenticacao.service.ts)).

---

## Comportamento esperado

1. **Dois temas:** claro (atual, padrão) e escuro.
2. **Alternância no popover da topbar:** no `#perfilPopover` há um controle de **Tema** (ex.:
   `p-toggleswitch` "Claro / Escuro" ou um item clicável com ícone `pi pi-moon`/`pi pi-sun`, no mesmo
   estilo do link "Minhas Anotações") que alterna o tema imediatamente, sem reload.
   - Por ser uma preferência **do dispositivo** (não um dado do usuário no banco) e o popover ser sempre
     o do usuário logado, não há gating por tipo/identidade — o controle simplesmente reflete o tema
     corrente da sessão.
3. **Persistência:** ao alternar, gravar a escolha em `localStorage`; ao abrir/recarregar o app, ler o
   `localStorage` e reaplicar o tema **antes da primeira renderização** (sem flash do tema claro).
4. **Default:** sem valor salvo no `localStorage` → tema **claro** (comportamento atual preservado).

---

## Implementação

### 1. Habilitar o modo escuro no PrimeNG — `app.config.ts`

Trocar `darkModeSelector: false` por um seletor de classe aplicado no `<html>`, ex.:

```typescript
theme: { preset: TemaAzul, options: { darkModeSelector: '.app-escuro' } },
```

Assim, adicionar a classe `app-escuro` em `document.documentElement` ativa o tema escuro; removê-la
volta ao claro.

### 2. Serviço de tema — `core/services/tema.service.ts`

Novo serviço `TemaService` (`providedIn: 'root'`), seguindo o padrão de Signals do projeto (sem
`BehaviorSubject`):

- Tipo local de tema (frontend-only, **não** é enum do `shared` por não cruzar para o backend):
  `type Tema = 'claro' | 'escuro'` em `core/models/tema.model.ts` (ou no próprio serviço), com a
  constante da chave de `localStorage` (ex.: `'tema'`).
- `temaAtual` — `signal<Tema>` inicializado a partir do `localStorage` (default `'claro'`).
- `eEscuro` — `computed` derivado de `temaAtual`.
- `definirTema(tema: Tema)` — atualiza o signal, grava no `localStorage` e aplica/remove a classe
  `app-escuro` em `document.documentElement` (via `Renderer2`/`DOCUMENT` — sem acessar `document`
  global diretamente quando evitável).
- `alternarTema()` — alterna claro ↔ escuro reaproveitando `definirTema`.
- Um helper interno `aplicarTema(tema)` que sincroniza a classe no `<html>` (chamado tanto na
  inicialização quanto em `definirTema`).

### 3. Aplicação na inicialização (sem flash)

Garantir que a classe seja aplicada **antes da primeira renderização**. Opções aceitáveis:

- Instanciar/`inject` o `TemaService` num `APP_INITIALIZER`/inicializador em `app.config.ts` que chame
  o `aplicarTema` com o valor lido do `localStorage`; **ou**
- Um pequeno script inline em [index.html](../../../frontend/src/index.html) que leia a chave do
  `localStorage` e adicione a classe `app-escuro` no `<html>` antes do bootstrap do Angular.

Escolher uma das abordagens e mantê-la única (o `TemaService` continua sendo a fonte de verdade em runtime).

### 4. Controle no popover da topbar — `TopbarComponent`

- Injetar `TemaService` no `TopbarComponent`.
- No `#perfilPopover` ([topbar.component.html](../../../frontend/src/app/shared/layout/topbar/topbar.component.html)),
  adicionar — abaixo do bloco de cargo / do link "Minhas Anotações" — um controle de **Tema** ligado a
  `temaService.eEscuro()` e chamando `alternarTema()` (ou `definirTema(...)`) na mudança. Pode ser um
  `p-toggleswitch` rotulado "Tema escuro" ou um item clicável no mesmo padrão visual do
  `topbar__link-anotacoes` (ícone `pi pi-moon`/`pi pi-sun` + label). Trocar o tema **não** deve fechar
  o app nem exigir reload.
- Importar o módulo PrimeNG necessário (ex.: `ToggleSwitchModule`) no `TopbarComponent` caso opte pelo
  switch.
- Estilos no `.scss` do próprio componente seguindo BEM em português (`topbar__tema`, etc.) — nada de
  `style=""` inline nem `.css`.

---

## Arquivos afetados

```
frontend/src/app/app.config.ts                                                         (darkModeSelector + inicialização)
frontend/src/app/core/services/tema.service.ts                                         (novo)
frontend/src/app/core/models/tema.model.ts                                             (novo — type Tema + chave localStorage)
frontend/src/app/shared/layout/topbar/topbar.component.ts                              (injeção + handlers + import do módulo)
frontend/src/app/shared/layout/topbar/topbar.component.html                            (controle de tema no #perfilPopover)
frontend/src/app/shared/layout/topbar/topbar.component.scss                            (estilos do controle)
frontend/src/index.html                                                                (apenas se a opção de script inline for escolhida)
```

---

## NÃO implementar nesta task

- Persistir o tema no backend (coluna em `usuario`, DTO ou endpoint) — a preferência é só `localStorage`.
- Mais de dois temas, temas customizados por cor, ou troca da paleta `primary` (continua azul/`TemaAzul`).
- Detecção automática via `prefers-color-scheme` do sistema operacional (pode ser uma task futura).
- Seletor de tema em outras telas (login, `UsuarioPerfilPage`, etc.) — nesta task a opção vive apenas no
  popover de perfil da topbar.
- Reescrever cores hardcoded de componentes que não usem tokens `surface-*`/`var(--p-*)`; ajustes
  pontuais de contraste, se surgirem, ficam fora do escopo desta task.
```
