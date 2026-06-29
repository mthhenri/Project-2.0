# Task 76 — Remover a "Prioridade" das demandas

## Objetivo

Remover por completo o campo **`prioridade`** da entidade **demanda** e todo o seu rastro no
sistema (DB, backend, shared, frontend e documentação). O conceito de prioridade
(`BAIXA / MEDIA / ALTA / CRITICA`) deixa de existir no domínio: a demanda passa a ser
descrita apenas por `status`, hierarquia e demais campos.

> **Motivação:** a prioridade manual não tem mais utilidade prática no fluxo atual — não há
> ordenação nem regra de negócio que dependa dela; ela só aparece em formulários e como
> enfeite visual (cor/raio). Removê-la simplifica o contrato (DTOs), os formulários e o grafo.

---

## Escopo

### 1. Migration (nova)

**Arquivo:** `backend/src/database/migrations/20240023_remover_prioridade_demanda.ts`

- `up`:
  - `DROP INDEX IF EXISTS ix_demanda_prioridade;`
  - `ALTER TABLE demanda DROP COLUMN IF EXISTS prioridade;`
- `down`: recria a coluna **no mesmo padrão da `20240005`** (sem `DEFAULT`, §16 #7):
  - `ALTER TABLE demanda ADD COLUMN prioridade VARCHAR(20);`
  - `UPDATE demanda SET prioridade = 'MEDIA';`
  - `ALTER TABLE demanda ALTER COLUMN prioridade SET NOT NULL;`
  - `ALTER TABLE demanda ADD CONSTRAINT <nome> CHECK (prioridade IN ('BAIXA','MEDIA','ALTA','CRITICA'));`
  - recriar `CREATE INDEX ix_demanda_prioridade ON demanda(prioridade) WHERE is_deleted = false;`

> **Estado atual do banco:** `prioridade` é `VARCHAR(20) NOT NULL CHECK (...)` com índice parcial
> `ix_demanda_prioridade` (migration `20240005`). A spec 79 (enums→tabelas de referência), que
> *converteria* `prioridade` em `tipo_demanda_prioridade`, **ainda não foi aplicada** — ver
> "Impacto em outras specs" abaixo.

### 2. Backend

- **`DemandaRepository`** (`demanda.repository.ts`) — remover toda menção a
  `prioridade`/`DemandaPrioridadeEnum`:
  - `inserir`: tirar `prioridade` da lista de colunas do INSERT, do `SELECT :prioridade`, do
    RETURNING e do objeto de parâmetros (`prioridade: dados.prioridade`).
  - `listar`: remover `demanda.prioridade` dos SELECTs (itens) **e** o ramo do filtro
    `if (filtros.prioridade !== undefined) { ... }` (push da condição + parâmetro).
  - `alterar`: remover o ramo do SET dinâmico (`if (dto.prioridade !== undefined) ...`),
    `prioridade` do RETURNING.
  - `recuperar`: remover `demanda.prioridade` do SELECT.
  - `recuperarGrafo` / árvore (CTE recursivo): remover `prioridade` do SELECT âncora, do SELECT
    recursivo (`demanda_filho.prioridade`) e do SELECT externo (`arvore_demanda.prioridade`), e
    do tipo inline da linha do CTE.
  - remover o `import { DemandaPrioridadeEnum }` e os campos `prioridade` dos tipos de retorno
    internos declarados no arquivo (linhas ~373/387).
- **`DemandaService`** (`demanda.service.ts`) — remover `prioridade: dto.prioridade` de `criar`
  e `alterar`, e `prioridade: item.prioridade` do mapeamento do grafo (`recuperarGrafo`).
- **Model** — remover `prioridade` de `backend/.../domain/models/demanda.model.ts` (e o import
  `DemandaPrioridadeEnum`; manter `DemandaStatusEnum`).

### 3. Shared

- **Enum** — deletar `shared/src/enums/demanda-prioridade.enum.ts` e remover a linha
  `export * from './demanda-prioridade.enum';` de `shared/src/enums/index.ts`.
- **DTOs** — remover o campo `prioridade` (e o `import` do enum + decorators
  `@ApiProperty`/`@ApiPropertyOptional`/`@IsEnum` órfãos) de:
  - `DemandaCriarDto` (obrigatório)
  - `DemandaAlterarDto` (opcional)
  - `DemandaInternoAlterarDto` (opcional — atualizar o comentário de contagem de campos)
  - `DemandaListarDto` (filtro opcional)
  - `DemandaCriadaDto`, `DemandaRecuperadaDto`, `DemandaResumoDto` (saída)
  - `DemandaArvoreItemDto`, `DemandaGrafoNoDto` (saída de árvore/grafo)

### 4. Frontend

- **`demanda-formulario-dialog`** (`.ts` + `.html`) — remover o campo "Prioridade":
  label + `<p-select formControlName="prioridade">`, o form control, a propriedade
  `prioridadeOpcoes`, os `prioridade: DemandaPrioridadeEnum.MEDIA` do reset/patch, o
  `prioridade: valor.prioridade!` no DTO de envio e o import do enum.
- **`demanda-edicao-dialog`** (`.ts` + `.html`) — idem: label + `p-select`, control,
  `prioridadeOpcoes`, `prioridade: valor.prioridade ?? undefined` no DTO, `prioridade:
  demanda.prioridade` no patch e o import.
- **`demanda-detalhe-dialog`** (`.html`) — remover o bloco de exibição
  "Prioridade" (`__info-label` + `__info-valor` com `demanda()!.prioridade`).
- **`demanda-arvore-item`** (`.ts`) — remover o método `severidadePrioridade()` e seu `Record`
  (o `p-tag` visível na árvore usa **status**, não prioridade — não há tag de prioridade a
  remover no `.html`); ajustar o import.
- **`demanda-grafo`** (`.ts`) — `calcularRaioNo` deixa de variar por prioridade e passa a
  depender **só de `isEstrutural`**, com **tamanho fixo** para cada caso:
  - **estrutural:** mantém o raio atual `28`.
  - **não-estrutural:** raio fixo **40% menor que o estrutural** → `28 × 0.6 = 16.8`.
  Implementar derivando do raio estrutural para deixar a relação explícita, ex.:
  ```ts
  private calcularRaioNo(no: DemandaGrafoNoDto): number {
    const raioEstrutural = 28;
    return no.isEstrutural ? raioEstrutural : raioEstrutural * 0.6; // 16.8
  }
  ```
  Remover `raioPorPrioridade` e o import `DemandaPrioridadeEnum`.
- **`demanda-projeto.page`** e **`projeto-detalhe.page`** (`.ts`) — remover `prioridade:
  no.prioridade` da montagem dos nós do grafo.
- **`demanda.model.ts`** (frontend) — remover `prioridade` e o import do enum.

### 5. Documentação

- `SCHEMA.md` — remover a coluna `prioridade` do `CREATE TABLE demanda` e o índice
  `ix_demanda_prioridade`.
- `SYSTEM.SPEC.md` — remover a linha `prioridade` da tabela **Demanda** (§13); remover a linha
  `demanda.prioridade → tipo_demanda_prioridade` das tabelas de enum em §5.4 e §6.2; remover
  `demanda-prioridade.enum.ts` da árvore de `shared/src/enums/` em §6.2.
- `CONTEXT.md` — registrar a task (entradas históricas que citam prioridade permanecem).

---

## Impacto em outras specs (atenção)

- **Spec 79 — `enums-para-tabelas-referencia` (backlog):** lista `demanda.prioridade` entre os
  enums a converter para tabela de referência (`tipo_demanda_prioridade`). Se a task 69 for
  concluída **antes** da 66, a 66 deve **remover `prioridade` do seu escopo** (linhas 43, 70,
  82, 98, 113, 150, 200 daquela spec). Recomenda-se executar a 69 primeiro e então editar a 66.
- **Spec 56 — `demanda-gestor-acesso-total-sem-atribuicao`:** não toca prioridade — sem
  conflito.

---

## Verificação

1. `npm run build --workspace=backend` e `npm run build --workspace=frontend` — sem erros.
2. `db:migrate` aplica a `20240020`; `db:rollback` reverte e re-aplica sem erro (coluna +
   índice + CHECK recriados no `down`).
3. Checagem negativa: `grep -ri "prioridade" backend/src frontend/src shared/src` retorna
   **vazio** (exceto a própria migration `20240020`).
4. Criar/editar demanda funciona sem o campo; árvore e grafo renderizam (grafo: nós
   estruturais com raio `28`, não-estruturais com raio fixo `16.8` = 40% menor); detalhe da
   demanda não exibe mais "Prioridade".

---

## NÃO implementar nesta task

- Nenhum campo substituto (ex.: "peso", "urgência") — apenas remoção.
- Não reescrever notas históricas do `CONTEXT.md`.
- Não converter outros enums em tabela de referência (isso é a spec 79).
