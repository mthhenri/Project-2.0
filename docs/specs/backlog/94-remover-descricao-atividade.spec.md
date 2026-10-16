# Task 94 — Remover a "Descrição" das atividades

## Objetivo

Remover por completo o campo **`descricao`** da entidade **atividade** e todo o seu rastro no
sistema (DB, backend, shared, frontend e documentação). A atividade passa a ser descrita apenas
por `nome`, `status`, executor e demanda vinculada.

> **Motivação:** o campo é opcional, raramente preenchido e duplica informação que já vive na
> demanda (descrição técnica/cliente/documentação) e na execução (que tem sua própria descrição
> obrigatória). Sua manutenção também deixou **3 implementações de UI divergentes** entre as
> telas que o editam (duas com `<textarea>` de texto puro e uma com `p-editor`/Quill), sem que o
> padrão HTML da demanda (task 39) jamais tenha sido estendido a ele. Removê-lo simplifica o
> contrato (DTOs), os formulários e o componente de assistente de IA.

---

## Escopo

### 1. Migration (nova)

**Arquivo:** `backend/src/database/migrations/0028 - Remoção da coluna descricao em atividade.sql`

Segue o formato atual do projeto (`.sql` puro, seções `-- UP` / `-- DOWN`, sem `DEFAULT`, sem
`VALUES`/interpolação — ver `0023 - Remoção da coluna prioridade em demanda.sql` como referência
mais próxima). A coluna é `TEXT` **nullable**, sem índice, `CHECK` ou `DEFAULT` associados — a
migration é simples:

```sql
-- UP

ALTER TABLE atividade DROP COLUMN IF EXISTS descricao;

-- DOWN

ALTER TABLE atividade ADD COLUMN descricao TEXT;
```

> **Estado atual do banco:** `atividade.descricao` é `TEXT` sem `NOT NULL`, sem `CHECK`, sem
> índice (criada na `0009 - Criação da tabela atividade.sql`, nunca alterada depois — a `0025`
> mexeu só em `status → tipo_atividade_status_id`). Por ser nullable e sem constraint, o `down`
> não precisa de backfill nem de `SET NOT NULL`.

### 2. Backend

- **`AtividadeRepository`** (`backend/src/modules/atividade/repositories/atividade.repository.ts`):
  - `inserir()` — remover `descricao` da lista de colunas do `INSERT`, do `SELECT :descricao`, do
    `RETURNING` e do objeto de parâmetros (`descricao: dados.descricao ?? null`).
  - `recuperar()` — remover `atividade.descricao` do `SELECT`.
  - `alterar()` — remover o branch do `SET` dinâmico (`if (dto.descricao !== undefined) { ... }`)
    e `descricao` do `RETURNING`.
  - `listar()` — **nada a mudar**: a listagem nunca expôs a descrição da própria atividade (só as
    flags de descrição da *demanda* e a `execucao_ativa.descricao`, que pertencem a outras
    entidades e ficam fora do escopo).
- **`AtividadeService`** (`backend/src/modules/atividade/services/atividade.service.ts`) — remover
  `descricao: dto.descricao ?? null` de `criar()` e `descricao: dto.descricao` de `alterar()`.
- **Model** (`backend/src/modules/atividade/domain/models/atividade.model.ts`) — remover o campo
  `descricao: string | null`.
- **Controller** — nenhuma mudança direta (é dumb, só repassa DTOs).

### 3. Shared

Remover o campo `descricao` de todos os DTOs em `shared/src/dtos/atividade/`:

- `AtividadeCriarDto` — remove `@IsOptional`/`@IsString` `descricao?: string` (entrada, opcional).
- `AtividadeAlterarDto` — idem.
- `AtividadeInternoAlterarDto` — remove `descricao?: string` (sem decorator, DTO interno).
- `AtividadeCriadaDto`, `AtividadeAlteradaDto`, `AtividadeRecuperadaDto` — remove
  `descricao: string | null` (saída).
- `AtividadeResumoDto` e `AtividadeListarDto` — **sem mudança**: nunca tiveram campo/filtro de
  descrição da própria atividade.

### 4. Componente compartilhado `assistente-descricao`

Os únicos 3 usos de `tipoEntidade="atividade"` são exatamente os 3 formulários de descrição de
atividade removidos abaixo — sem eles, `'atividade'` fica órfão no tipo. Remover:

- `frontend/src/app/shared/components/assistente-descricao/assistente-descricao.component.ts` —
  `@Input() tipoEntidade: 'execucao' | 'atividade' | 'demanda'` → `'execucao' | 'demanda'`.
- `shared/src/dtos/assistente/AssistenteDescricaoAuxiliarDto.ts` — mesmo ajuste na união
  `tipoEntidade`.
- `backend/src/modules/assistente/services/assistente.service.ts` — remover a chave
  `atividade: 'atividade de desenvolvimento'` do objeto `tipoEntidadeFormatado`.

### 5. Frontend — as 3 telas que editam a descrição da atividade

- **`atividade-formulario.page.ts` / `.html`** (`pages/atividade-formulario/`) — remover do
  `formulario` o control `descricao: ['']`; do `salvar()` o trecho `const descricao = valor.descricao?.trim(); if (descricao) dto.descricao = descricao;`;
  o método `aceitarDescricaoAssistente()`; e o import de `AssistenteDescricaoComponent` (não é
  mais usado nesta página). No `.html`, remover o bloco inteiro do campo "Descrição" (label +
  `<textarea id="descricao" pTextarea formControlName="descricao">` + `<app-assistente-descricao>`).
- **`atividade-detalhe.page.ts` / `.html`** (`pages/atividade-detalhe/`) — remover
  `formularioDescricao`, os signals `mostrarDialogDescricao`/`carregandoDescricao`, os métodos
  `abrirDialogDescricao()`/`salvarDescricao()`/`aceitarDescricaoAssistente()`, e o import de
  `AssistenteDescricaoComponent`. No `.html`, remover a seção `<section>` "Descrição" (título +
  botão "Editar" + `@if (atividade.descricao) { ... } @else { "Sem descrição." }`) e o `<p-dialog>`
  "Editar descrição" inteiro (textarea + assistente + footer). No `.scss`, remover a classe
  `&__descricao` (a `&__execucao-descricao` é de execução — não mexer).
- **`atividade-visualizar-dialog.component.ts` / `.html`** (`components/atividade-visualizar-dialog/`)
  — este é o dialog realmente usado hoje (aberto via ícone de olho na listagem; usa `p-editor`/Quill
  em vez de `<textarea>`, divergente das outras duas telas). Remover o signal
  `salvandoDescricao`, o `formularioDescricao` (form group `descricao: ['']`), o método
  `salvarDescricao()`, o `patchValue({ descricao: ... })` dentro de `abrir()`, e o import de
  `EditorModule` (usado só por este campo — confirmar que nenhum outro trecho do componente usa
  `p-editor` antes de remover o import). No `.html`, a aba "Descrição" (`<p-tab>`/`<p-tabpanel>`
  com o `<p-editor formControlName="descricao">` + botão "Salvar descrição") é removida; como
  resultado sobra só a aba "Últimas execuções" — **substituir o `<p-tabs>` por conteúdo direto**
  (sem abas, já que uma única aba não faz sentido como `p-tabs`), mantendo a lista de execuções
  recentes tal como está. No `.scss`, remover `&__descricao-form`/`&__descricao-acoes` (a
  `&__execucao-descricao` é de execução — não mexer) e as classes de abas que ficarem órfãs.
- **`atividade-listagem.page.ts` / `.html`** (`pages/atividade-listagem/`, dialog "Nova Atividade")
  — remover do `formularioNova` o control `descricao: ['']`; do `abrirDialogNova()` o
  `descricao: ''` do reset; do `salvarNova()` o trecho `const descricao = valor.descricao?.trim(); if (descricao) dto.descricao = descricao;`;
  o método `aceitarDescricaoAssistenteNova()`. **Atenção:** esta página importa
  `AssistenteDescricaoComponent` para **múltiplos** usos (descrição da demanda, descrição de
  execução, descrição de registro manual) além do de "nova atividade" — **não remover o import**,
  só o bloco específico. No `.html`, remover o `<div class="atividade-listagem__dialog-campo">`
  do campo "Descrição" do dialog de nova atividade (label + `<textarea id="nova-descricao">` +
  `<app-assistente-descricao tipoEntidade="atividade">`). No `.scss`, revisar se `&__descricao`/
  `&__descricao-form` (linhas ~326/333) são exclusivos deste campo ou compartilhados com o dialog
  de descrição da demanda antes de remover (não remover `&__descricao-rica`/`--cheio`, que são do
  dialog de descrição da demanda).

### 6. Documentação

- `SCHEMA.md` — remover a linha `descricao TEXT,` do `CREATE TABLE atividade`.
- `SYSTEM.SPEC.md`:
  - §13 (tabela de campos da entidade `Atividade`) — remover a linha
    `| descricao | TEXT | NULL | opcional |`.
  - §8.3 (Componente Assistente de Descrição) — trocar "reutilizável nos formulários de execução,
    atividade e demanda" por "execução e demanda"; remover `| 'atividade'` da união
    `tipoEntidade` no bloco de código.
  - Regra de caracteres proibidos (trecho "Cor, código de projeto, descrições de demanda,
    descrição de atividade, anotações e login/senha estão fora do escopo desta regra") — remover
    "descrição de atividade," da frase (o campo deixa de existir; **não mexer** na lista de DTOs
    cobertos logo acima, que já não citava `descricao` de atividade).
- `CONTEXT.md` — registrar a task (entradas históricas que citam a descrição de atividade
  permanecem intocadas).

---

## Impacto em outras specs (atenção)

- Nenhuma spec em `docs/specs/backlog/` ou `docs/specs/active/` toca `atividade.descricao` (ambos
  os diretórios estão vazios no momento desta spec).

---

## Verificação

1. `npm run build --workspace=backend` e `npm run build --workspace=frontend` — sem erros.
2. `db:migrate` aplica a `0028`; `db:rollback` reverte e re-aplica sem erro (coluna volta como
   `TEXT` nullable, sem constraint a recriar).
3. Checagem negativa: `grep -rn "descricao" backend/src/modules/atividade frontend/src/app/modules/atividade shared/src/dtos/atividade` retorna **vazio** (exceto ocorrências de descrição da *demanda*/*execução* dentro de `atividade-listagem`/`atividade-visualizar-dialog`, que permanecem).
4. Criar atividade (formulário dedicado e dialog "Nova Atividade" da listagem) funciona sem o
   campo; dialog de visualização (ícone de olho) abre sem a aba/campo "Descrição", mostrando
   direto as execuções recentes; tela de detalhe (`/atividade/:id`) não exibe mais a seção
   "Descrição" nem o botão "Editar" correspondente.
5. `assistente-descricao` continua funcionando nos formulários de execução e de descrição da
   demanda (dentro da listagem de atividades).

---

## NÃO implementar nesta task

- Não remover a descrição da **demanda** (`descricaoCliente`/`descricaoTecnica`/`documentacao`)
  nem da **execução** — só a da atividade.
- Nenhum campo substituto — apenas remoção.
- Não reescrever notas históricas do `CONTEXT.md`.
- Não estender o padrão Quill/HTML (task 39) a nenhum campo remanescente — está fora de escopo,
  já que o campo em questão está sendo removido, não migrado.
