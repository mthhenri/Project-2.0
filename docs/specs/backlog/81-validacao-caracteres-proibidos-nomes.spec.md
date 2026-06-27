# Task 81 — shared/backend/frontend: Validação de Caracteres Proibidos em Nomes e Descrições de Execução

## Objetivo

Impedir que o usuário cadastre **nomes** de **projetos, demandas, atividades e tags** e
**descrições de execução** contendo os caracteres:

```
'   "   `   ~   ^   \
```

(aspas simples, aspas duplas, crase/backtick, til, circunflexo e barra invertida).

A validação é **autoritativa no backend** (DTOs de entrada via `class-validator`) e
**espelhada no frontend** (Reactive Forms) para feedback imediato — o backend continua
sendo a fonte da verdade.

> **Decisão (fonte única):** o conjunto de caracteres e a mensagem de erro vivem em **um
> único lugar no `shared`** (regex + mensagem exportadas), reutilizados por todos os DTOs e
> formulários. Nada de regex duplicada por DTO.

---

## Contexto

Hoje os campos abaixo só validam tipo/obrigatoriedade/tamanho (`@IsString`, `@IsNotEmpty`,
`@MaxLength`, `@MinLength`), sem restrição de caracteres:

| Entidade | Campo | DTO de entrada (`@Body`) |
|---|---|---|
| Projeto | `nome` | `ProjetoCriarDto`, `ProjetoAlterarDto` |
| Demanda | `nome` | `DemandaCriarDto`, `DemandaAlterarDto` |
| Atividade | `nome` | `AtividadeCriarDto`, `AtividadeAlterarDto` |
| Tag | `nome` | `TagCriarDto`, `TagAlterarDto` |
| Execução | `descricao` | `ExecucaoIniciarDto`, `ExecucaoEncerrarDto`, `ExecucaoRegistrarDto`, `ExecucaoAlterarDto` |

Esses caracteres causam ruído em SQL/JSON/markdown e em exibição; bloqueá-los na entrada
mantém os dados limpos. (A defesa contra SQL injection continua sendo os parâmetros nomeados
— esta task é de **higiene de dados**, não de segurança.)

---

## Escopo

### 1. `shared` — regex + mensagem (fonte única)

**Arquivo novo:** `shared/src/validators/caracteres-proibidos.validator.ts`

```typescript
/**
 * Caracteres proibidos em nomes (projeto, demanda, atividade, tag) e em
 * descrições de execução: '  "  `  ~  ^  \
 */
export const CARACTERES_PROIBIDOS = `'"\`~^\\`;

/**
 * Passa apenas quando a string NÃO contém nenhum caractere proibido.
 * O primeiro `^` é a negação da classe; o `^` literal aparece dentro da classe.
 */
export const REGEX_SEM_CARACTERES_PROIBIDOS = /^[^'"`~^\\]*$/;

export const MENSAGEM_CARACTERES_PROIBIDOS =
  'Não são permitidos os caracteres: \' " ` ~ ^ \\';
```

- Exportar pelo barrel: criar/atualizar `shared/src/validators/index.ts` e re-exportar em
  `shared/src/index.ts` (verificar o padrão de barrels já usado em `dtos`/`enums`/`interfaces`).
- **Pasta `validators/` em inglês** (conceito arquitetural genérico — regra de linguagem §16);
  os identificadores do conteúdo são de negócio em português (`CARACTERES_PROIBIDOS`).
- Não usar `class-validator` aqui (o `shared` é consumido também pelo frontend) — apenas
  constantes puras. O decorator `@Matches` é aplicado nos DTOs.

### 2. Backend — aplicar `@Matches` nos DTOs de entrada

Em **cada** campo da tabela do Contexto, adicionar:

```typescript
import { Matches } from 'class-validator';
import {
  REGEX_SEM_CARACTERES_PROIBIDOS,
  MENSAGEM_CARACTERES_PROIBIDOS,
} from '@project20/shared/validators';

@Matches(REGEX_SEM_CARACTERES_PROIBIDOS, { message: MENSAGEM_CARACTERES_PROIBIDOS })
nome: string; // (ou descricao)
```

- Manter os decorators existentes (`@IsString`, `@IsNotEmpty`/`@MinLength`, `@MaxLength`,
  `@IsOptional`); apenas **acrescentar** o `@Matches`.
- Em campos **opcionais** (`ExecucaoIniciarDto.descricao?`), o `@IsOptional` já curto-circuita
  quando ausente — o `@Matches` só roda quando há valor. Manter a ordem (`@IsOptional` antes).
- **NÃO** alterar os DTOs internos (`*InternoAlterarDto`, `ExecucaoInternoEncerrarDto` etc.):
  são montados pela controller/serviço e não recebem `@Body` — a validação ocorre no DTO público.
- **NÃO** alterar DTOs de **saída** (`*Criado/Alterado/Resumo/Recuperado`), nem outros campos
  (cor, código, descrições de demanda, documentação) — fora do escopo desta task.

### 3. Frontend — espelhar nos Reactive Forms

Adicionar `Validators.pattern(REGEX_SEM_CARACTERES_PROIBIDOS)` ao control correspondente e
exibir a mensagem `MENSAGEM_CARACTERES_PROIBIDOS` quando `errors?.['pattern']`, no padrão de
erro de formulário já existente em cada tela.

Formulários a tocar (control `nome`, salvo indicação):

- **Projeto:** `projeto-formulario-dialog.component.ts` (criação) e `demanda-edicao-dialog`? não —
  edição de projeto: `projeto-detalhe.page.ts`.
- **Demanda:** `demanda-formulario-dialog.component.ts` (criação), `demanda-edicao-dialog.component.ts`
  e o título inline de `demanda-detalhe-dialog.component.ts` (se editar nome).
- **Atividade:** `atividade-formulario.page.ts`, criação rápida em `atividade-listagem.page.ts`,
  e edição inline do nome em `atividade-visualizar-dialog.component.ts`.
- **Tag:** `tag-listagem.page.ts`.
- **Execução (`descricao`):** os dialogs de iniciar/encerrar/registrar/editar execução
  (`atividade-listagem.page.ts` e o histórico de execução) — onde houver control `descricao`.

> Importar a regex/mensagem do `shared` (`@project20/shared/validators`) — **não** redeclarar a
> regex no frontend (fonte única, regra anti-duplicação).

---

## Atualização de Documentação (obrigatória)

1. `CONVENTIONS.md` — na seção de DTOs/validação, registrar a regra: nomes (projeto/demanda/
   atividade/tag) e descrição de execução proíbem `'  "  \`  ~  ^  \`, validados via
   `REGEX_SEM_CARACTERES_PROIBIDOS` do `shared`.
2. `SYSTEM.SPEC.md` — se houver seção de regras de validação de entrada, acrescentar a regra e o
   conjunto de caracteres; caso contrário, documentar junto às convenções de DTO.
3. `CONTEXT.md` — registrar a task concluída, os DTOs/forms tocados e o novo arquivo do `shared`.
4. Mover a spec `backlog/69-...` → `done/` ao concluir.

---

## Verificação

1. `npm run build --workspace=backend` (nest build) OK — type-check cobre o TS-fonte do `shared`.
2. `npm run build --workspace=frontend` OK (só warnings pré-existentes de budget/CommonJS).
3. **API (backend autoritativo):**
   - `POST /api/v1/projeto` com `nome: "Projeto \" teste"` → **400** com a mensagem de caracteres proibidos; idem para `~`, `^`, `` ` ``, `'`, `\`.
   - `POST /api/v1/tag`, `POST`/`PUT` de demanda e atividade → mesmo comportamento no `nome`.
   - Iniciar/registrar/encerrar/editar execução com `descricao` contendo um proibido → **400**.
   - Valores limpos (sem os caracteres) → **201/200** normalmente; descrição **ausente** em
     `ExecucaoIniciarDto` (opcional) continua aceita.
4. **Frontend:** digitar um caractere proibido no campo exibe a mensagem e bloqueia o submit
   (botão Salvar desabilitado/`form.invalid`); remover o caractere libera o submit.
5. `grep` confirma fonte única: a regex literal `[^'"\`~^\\]` aparece **apenas** em
   `shared/src/validators/caracteres-proibidos.validator.ts` (não duplicada em DTOs nem no frontend).

---

## NÃO implementar nesta task

- Validar **outros** campos: cor, código de projeto, descrições de demanda
  (`descricaoTecnica`/`descricaoCliente`/`documentacao`), descrição de atividade, anotações de
  usuário, login/senha. Apenas os 5 alvos listados (4 nomes + descrição de execução).
- Migrations ou limpeza de dados já existentes no banco (a regra vale para entradas novas).
- Sanitização/escape automático (substituir caracteres) — a regra é **rejeitar**, não transformar.
- Tocar DTOs internos (`*InternoAlterarDto`) ou DTOs de saída.
