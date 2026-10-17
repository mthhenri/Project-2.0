---
name: sql-migrations
description: >
  Escrever migration, decidir onde um dado novo vive (coluna, tabela de referência ou campo de
  documento) e escrever SQL de repositório. Use ao tocar schema, criar/alterar tabela ou coluna,
  adicionar enum, ou escrever/revisar qualquer query em repository — mesmo sem a palavra
  "migration" aparecer. Erro aqui costuma ser a única categoria irreversível em produção.
---

# Migrations e SQL

> A regra vive em `docs/CONVENTIONS.md` ("SQL"/"Enums"/"Migrations") e `docs/SYSTEM.SPEC.md`
> §9 (sobretudo §9.2 e §9.5) e `docs/SCHEMA.md`; em conflito com esta skill, o documento vence. **Nunca confie num número de migration
> escrito em doc** — só no comando que lista o diretório real.

## 1. Onde o dado vive

- **Todo dado de negócio é relacional** — o projeto não usa campo de documento (JSONB) para
  conteúdo. Coluna nova em tabela existente, ou tabela nova com os campos da BaseEntity.
- **Enum de coluna** (participa de `WHERE`/`JOIN`/FK) → tabela de referência
  `tipo_<tabela>_<complemento?>` (`codigo` + `descricao`, BaseEntity) e coluna de negócio
  `INTEGER` FK (`SYSTEM.SPEC.md` §5.4, "Enums são sempre tabelas de referência"). O repositório
  traduz `codigo ↔ id` — DTO/service/frontend só veem o valor do enum TypeScript de `shared/`.
- **Tabelas de junção** (`demanda_tag`, `atividade_tag`, `demanda_usuario`) ficam no módulo pai,
  sem módulo NestJS próprio.

## 2. Escrever a migration

`.sql` puro em `backend/src/database/migrations/`, nome `NNNN - Descrição.sql` (quatro dígitos +
` - ` + frase legível), carregado pelo `SqlMigrationSource` (`SYSTEM.SPEC.md` §9.5). Descubra o
próximo número pelo diretório, sempre:

```bash
ls "backend/src/database/migrations/" | sort | tail -1
```

- `-- UP` e `-- DOWN` sozinhos na linha; sem `-- DOWN`, o rollback daquela migration falha.
- **Nunca** `BEGIN`/`COMMIT`/`ROLLBACK` manual: o Knex abre uma transação por migration. Instrução
  que não roda em transação (ex.: `CREATE INDEX CONCURRENTLY`) leva `-- NO TRANSACTION`.
- Campos da BaseEntity sempre explícitos (`created_date`/`updated_date`/`is_deleted`/
  `deleted_date`), nunca com `DEFAULT` (`SYSTEM.SPEC.md` §9.1–§9.2). Datas como `timestamptz`.
- Ambiente que já existia antes da troca de empacotamento (task 90) precisa ter rodado
  `backend/src/database/realinhar-knex-migrations.sql` uma vez; migration nova não depende disso.

## 3. Nomes e prefixos

Nomenclatura de tabela/coluna conforme a decisão registrada em `CONVENTIONS.md`. Campo de data
com sufixo consistente — nunca dois padrões (`_date` e `_at`) convivendo.

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_<tabela>` |
| Foreign key | `fk_` | `fk_<tabela>_<tabela-referenciada>` |
| Unique index | `uix_` | `uix_<tabela>_<coluna>` |
| Index | `ix_` | `ix_<tabela>_<coluna>` |
| Check constraint | `chk_` | `chk_<tabela>_<regra>` |
| Trigger | `trg_` | `trg_<tabela>_<evento>` |
| Function | `fn_` | `fn_<acao>` |

> A task 70 padronizou os nomes (`chk_`, não `ck_`) e alinhou as duas exceções por
> `RENAME CONSTRAINT` na migration 0020 — nunca edite migration já aplicada.

## 4. SQL de repositório

Só SQL, estendendo o repositório base do projeto. Parâmetro nomeado sempre — nunca posicional,
nunca interpolação. `INSERT ... SELECT :campo ... RETURNING` no lugar de `VALUES`, se essa for a
convenção adotada (evita que um `DEFAULT` de coluna produza valor implícito não visível no código).
Todo `SELECT` filtra a exclusão lógica, se o projeto usa soft delete. Alias descritivo (nunca
abreviado). DTO interno no parâmetro, nunca primitivo solto nem objeto parcial genérico. Query do
módulo A nunca no repositório do módulo B.

**Tradução `codigo ↔ id`**, se o projeto usa tabela de referência para enum de coluna: leitura
resolve com `JOIN tipo_<entidade> ON tipo_<entidade>.id = <tabela>.tipo_<entidade>_id` selecionando
`tipo_<entidade>.codigo AS <campo>`; escrita resolve com subquery
`(SELECT id FROM tipo_<entidade> WHERE codigo = :valor AND is_deleted = false)` no lugar do FK — a
service só vê `codigo` (o enum de código), nunca o id.

**Única exceção a parâmetro nomeado:** dentro de `backend/src/database/migrations/`, valores
constantes são literais SQL (escapando aspas), porque migration não recebe input de usuário. O
runtime (repositório) continua 100% parametrizado.
**Coluna `NUMERIC`/`DATE`:** cast explícito no `SELECT`/`RETURNING` (`::double precision`) — o
driver `pg` devolve `NUMERIC` como string (`CONTEXT.md` §3, task 82).

## 5. Rodar, reverter, produção

```bash
npm run db:migrate --workspace=backend     # aplica as pendentes
npm run db:rollback --workspace=backend    # reverte o último lote
# não há comando de reset + seed; para recomeçar em dev: npm run db:down, apague o volume e db:up
```

Em produção, confirmar que a migration **rodou** no ambiente de destino nunca é dispensável —
migration commitada e deployada não é migration aplicada, principalmente em qualquer pipeline de
deploy que não gatilhe a migration automaticamente.

## Checklist pré-commit

Número livre (conferido pelo comando, não por memória) → nome descritivo → `-- UP` e `-- DOWN`
presentes → prefixos corretos → colunas de entidade base completas e explícitas, sem `DEFAULT`
implícito (se essa for a convenção) → rollback testado de verdade: aplicar → reverter → aplicar
de novo, sem erro.
