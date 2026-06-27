# Task 70 — core/db: Padronização de Nomes de Constraints

## Objetivo

Padronizar a nomenclatura dos objetos de banco (constraints, índices, triggers, funções)
numa convenção única e documentá-la, **e** corrigir as duas constraints que hoje fogem do
padrão, via migration nova (sem editar migrations já aplicadas).

> **Referência cruzada:** audit de consistência (A4). As migrations originais já seguem
> `ix_`/`uix_`/`chk_`/`trg_`/`fn_`; só duas constraints destoam.

---

## Contexto

A varredura encontrou duas constraints fora do prefixo `chk_` usado no restante do schema:
- `demanda_status_check` — nome auto-gerado pelo PostgreSQL na `migration 20240013_alterar_status_demanda.ts`.
- `ck_dia_nao_util_duracao` — prefixo `ck_` (em vez de `chk_`) na `migration 20240014_adicionar_duracao_dia_nao_util.ts`.

Não há uma convenção de nomes de objetos escrita em `SCHEMA.md`/`CONVENTIONS.md`, apesar de
o código segui-la informalmente. Esta task formaliza o padrão e alinha as duas exceções.

---

## Escopo

### 1. Documentar a convenção (SCHEMA.md + CONVENTIONS.md)

Padrão `<prefixo>_<tabela>_<proposito>`:

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_usuario` |
| Foreign key | `fk_` | `fk_demanda_projeto` |
| Unique index | `uix_` | `uix_usuario_login_ativo` |
| Index | `ix_` | `ix_demanda_status` |
| Check constraint | `chk_` | `chk_execucao_periodo_valido` |
| Trigger | `trg_` | `trg_usuario_updated_date` |
| Function | `fn_` | `fn_set_updated_date` |

- `SCHEMA.md`: acrescentar este bloco no topo (seção "Convenções deste Schema").
- `CONVENTIONS.md`: na seção SQL, adicionar a tabela/regra de prefixos (e manter a regra de idioma: objetos genéricos em inglês, tabelas/colunas de negócio em português).

### 2. Migration de renomeação

**Arquivo novo:** `backend/src/database/migrations/20240020_padronizar_nomes_constraints.ts`

**`up`:**
```sql
ALTER TABLE demanda     RENAME CONSTRAINT demanda_status_check     TO chk_demanda_status;
ALTER TABLE dia_nao_util RENAME CONSTRAINT ck_dia_nao_util_duracao TO chk_dia_nao_util_duracao;
```

**`down`:** reverter os dois nomes (`chk_demanda_status → demanda_status_check`,
`chk_dia_nao_util_duracao → ck_dia_nao_util_duracao`).

> Usar `ALTER TABLE … RENAME CONSTRAINT` (não drop/recreate) — preserva a definição.
> Não editar as migrations `20240013`/`20240014` já aplicadas.

---

## Atualização de Documentação (obrigatória)

1. `SCHEMA.md` — bloco de convenção de nomes + atualizar o nome da constraint de `dia_nao_util`
   para `chk_dia_nao_util_duracao` (sincroniza com a task 69/A2, se já tiver rodado).
2. `CONVENTIONS.md` — tabela de prefixos na seção SQL.
3. `CONTEXT.md` — registrar a migration `20240017` na tabela "Banco de Dados" e a decisão de padrão de nomes.

---

## Verificação

1. `npm run build --workspace=backend` OK.
2. `npm run db:migrate --workspace=backend` aplica a `20240017`; `db:rollback` reverte; reaplicar.
3. No banco: `\d demanda` mostra `chk_demanda_status`; `\d dia_nao_util` mostra `chk_dia_nao_util_duracao`; os nomes antigos não existem mais.
4. `grep -rn "demanda_status_check\|ck_dia_nao_util_duracao" backend/src` — só nas migrations `20240013`/`20240014`/`20240017` (criação/rename), não em código de aplicação.

---

## NÃO implementar nesta task

- Renomear constraints que já seguem o padrão (`chk_execucao_periodo_valido`, `chk_demanda_conexao_sem_autorreferencia`, índices `ix_*`/`uix_*`, triggers `trg_*`).
- Editar in-place as migrations já aplicadas.
- Mudar schema/colunas/comportamento — apenas nomes de constraint + documentação.
