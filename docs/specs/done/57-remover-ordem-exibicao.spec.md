# Task 57 — Remover a coluna `ordem_exibicao` (demanda + atividade)

## Objetivo

Remover por completo a coluna `ordem_exibicao` das tabelas **demanda** e **atividade**
e todo o seu rastro no sistema (DB, backend, shared, frontend e documentação). O campo
era preenchido manualmente e não tem mais utilidade prática: a ordenação dessas entidades
passa a ser **sempre por nome**.

> **Motivação:** nas listagens/árvore/grafo a ordenação útil é alfabética por `nome`; o
> "peso" manual de exibição nunca se mostrou necessário (a listagem de atividade já nem o
> usava no `ORDER BY`). Remover simplifica os formulários e o contrato.

---

## Escopo

### 1. Migration (nova)

**Arquivo:** `backend/src/database/migrations/20240019_remover_ordem_exibicao.ts`

- `up`: `ALTER TABLE demanda DROP COLUMN IF EXISTS ordem_exibicao;` e o mesmo para `atividade`.
- `down`: recria a coluna no padrão da `20240014` (sem `DEFAULT`): `ADD COLUMN ordem_exibicao INTEGER`
  → `UPDATE ... SET ordem_exibicao = 0` → `ALTER COLUMN ... SET NOT NULL`, nas duas tabelas.

### 2. Backend

- **`DemandaRepository`** — remover `ordem_exibicao`/`ordemExibicao` do INSERT, do RETURNING
  (`inserir`), dos SELECTs (`recuperar`, `listar`, RETURNING do `alterar`) e do ramo do SET
  dinâmico. Trocar `ORDER BY demanda.ordem_exibicao ASC, demanda.nome ASC` (`listar`) e
  `ORDER BY demanda.ordem_exibicao ASC` (`recuperarGrafo`) por `ORDER BY demanda.nome ASC`.
- **`AtividadeRepository`** — idem no INSERT/RETURNING/SELECTs (`inserir`, `recuperar`,
  `listar`, RETURNING do `alterar`) e no ramo do SET. O `ORDER BY` da `listar` já era
  `usuario.nome_completo, created_date, nome` — **sem mudança**.
- **Services** — `DemandaService.criar`/`alterar` e `AtividadeService.criar`/`alterar`
  deixam de repassar `ordemExibicao`.
- **Models** — remover `ordemExibicao` de `demanda.model.ts` e `atividade.model.ts`.

### 3. Shared (13 DTOs)

Remover `ordemExibicao` de: `DemandaCriarDto`, `DemandaAlterarDto`, `DemandaCriadaDto`,
`DemandaInternoAlterarDto` (comentário "onze"→"dez" campos), `DemandaResumoDto`,
`DemandaRecuperadaDto`; e `AtividadeCriarDto`, `AtividadeAlterarDto`, `AtividadeCriadaDto`,
`AtividadeAlteradaDto`, `AtividadeResumoDto`, `AtividadeInternoAlterarDto`,
`AtividadeRecuperadaDto`. Em `AtividadeAlterarDto` os imports `IsNumber`/`Min` ficam órfãos —
removê-los.

### 4. Frontend

- Remover o campo "Ordem de Exibição/exibição" (label + `p-inputnumber` + form control +
  reset/patch + campo no DTO) de `demanda-formulario-dialog`, `demanda-edicao-dialog` e
  `atividade-formulario.page`. No `atividade-formulario.page` o `InputNumberModule` fica
  órfão — removê-lo dos imports.
- `atividade-listagem.page` deixa de enviar `ordemExibicao: 0` na criação rápida.

### 5. Documentação

- `SCHEMA.md` — remover a coluna dos dois `CREATE TABLE`.
- `SYSTEM.SPEC.md` — remover as duas linhas de tabela.
- `CONTEXT.md` — registrar a task.

---

## Verificação

1. `npm run build --workspace=backend` e `npm run build --workspace=frontend` — sem erros.
2. `db:migrate` aplica a `20240019`; `db:rollback` reverte e re-aplica sem erro.
3. Checagem negativa: `grep -ri "ordemExibicao\|ordem_exibicao"` em `backend/src`,
   `frontend/src` e `shared/src` vazio (exceto a própria migration `20240019`).
4. Listagens de demanda e árvore/grafo ordenam por `nome`; criação/edição de demanda e
   atividade funcionam sem o campo.

---

## NÃO implementar nesta task

- Qualquer reordenação manual alternativa (drag-and-drop, etc.) — apenas remoção.
- Reescrever as notas históricas do `CONTEXT.md` (entradas de tasks anteriores que citam o
  campo permanecem como registro histórico).
