# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory Session Start

Before any implementation, read these files in order:
1. `docs/SYSTEM.SPEC.md` — constitution of the project, takes precedence over everything
2. `docs/CONVENTIONS.md` — quick reference for code conventions
3. `docs/CONTEXT.md` — current project state and next task

## Development Commands

```bash
# Install dependencies (run from root)
npm install

# Database
npm run db:up               # start PostgreSQL via Docker Compose
npm run db:down             # stop PostgreSQL
npm run db:migrate --workspace=backend   # run pending migrations
npm run db:rollback --workspace=backend  # rollback last migration

# Development servers (run in separate terminals)
npm run backend:dev         # NestJS API on http://localhost:3000
npm run frontend:dev        # Angular SPA on http://localhost:4200 (with proxy to backend)
```

## Task Workflow (Spec-Driven Development)

```
1. Move spec: docs/specs/backlog/<task>.spec.md → docs/specs/active/
2. Implement exactly what the spec defines — do not extrapolate
3. Move spec: docs/specs/active/<task>.spec.md → docs/specs/done/
4. Update docs/CONTEXT.md (implemented items, module status, next task)
```

## Architecture Overview

Monorepo with three npm workspace packages:

- **`shared/`** (`@project20/shared`) — DTOs, enums, and generic interfaces shared between backend and frontend. DTOs and enums are **never** redefined inside `backend/` or `frontend/`.
- **`backend/`** — NestJS REST API. Pattern: `controller (dumb) → service (business logic) → repository (raw SQL only)`
- **`frontend/`** — Angular 21 SPA with standalone components and Signals for state

## Language Rule

**Test:** "Would this concept exist in any software project?"
- **Yes → English** (folder names, generic classes, BaseEntity fields, exceptions, decorators)
- **No → Portuguese** (entity files, methods, variables, DTOs, enum values, table names, columns)

## Backend Constraints

**Controller** — dumb, no logic, no try/catch, no if:
```typescript
@Post()
criar(@Body() dto: UsuarioCriarDto) {
  return this.usuarioService.criar(dto);
}
```

**Repository** — SQL only, no business logic. Always extends `BaseRepository`:
- Use `executarConsulta<T>()` for SELECTs returning rows
- Use `executarComando()` for fire-and-forget statements
- Use `executarSoftDelete(id)` — never physical DELETE

**Service** — all business rules, validations, orchestration. Throws `BusinessException`, `ResourceNotFoundException`, or `UnauthorizedAccessException`.

## SQL Rules (All Mandatory)

- Every SELECT: `WHERE [table].is_deleted = false`
- Named parameters only: `:nomeParametro` with object — never `?` positional, never string interpolation
- INSERT pattern: `INSERT INTO tabela (...) SELECT :campo1, :campo2 RETURNING ...` — never `VALUES`
- No `DEFAULT` on any column — application always provides all values explicitly
- No abbreviated aliases — use full table name or descriptive alias (`demanda_filho`, not `d`)
- Date fields: `[context]_date` (English/BaseEntity) or `[context]_data` (Portuguese/business) — never `_at`, `_em`, or `data_[context]`
- Hierarchies and graphs: PostgreSQL recursive CTEs
- Tables: singular Portuguese snake_case (`usuario`, `demanda`, `dia_nao_util`)

## Shared Package Imports

```typescript
import { UsuarioCriarDto }    from '@project20/shared/dtos/usuario';
import { UsuarioTipoEnum }    from '@project20/shared/enums';
import { StandardResponse }   from '@project20/shared/interfaces';
```

## Frontend Constraints

- **Always standalone components** — never NgModule per feature
- **Signals** for reactive state (`signal`, `computed`, `effect`) — avoid Subject/BehaviorSubject
- **Reactive Forms** only — no template-driven forms
- **Styles**: `.scss` always (never `.css`), Tailwind for utilities, BEM in Portuguese for custom classes
- No `style=""` inline, no ID selectors in SCSS
- Lazy loading via `loadComponent` in routes

## Key Business Rules

- No two active executions (without `fim_data`) per user simultaneously — enforced on the **activity owner** (`atividade.usuario_id`), since an execution has no user column of its own
- Starting/pausing executions: a **gestor** can start and pause the execution of **any** user's activity; a **developer** can only start and pause their **own** activities. Authorization is by user type + activity ownership, never via a `demanda_usuario` check
- Soft delete everywhere — never physical DELETE
- Access control: Developers see only projects where they have at least one `demanda_usuario` entry
- Gestores are **not** added to `demanda_usuario` (neither at demand creation nor when assigned an activity) — their access is granted by type (full access, bypassing the `demanda_usuario` filter), not by assignment
- No `projeto_usuario` table — project access is derived from `demanda_usuario`
- Graph connections (DemandaConexao) must be validated for cycles via recursive CTE before insert

## Naming Conventions

**DTOs:** `Entidade + Complemento? + Verbo + Dto`
- Input (infinitive): `UsuarioCriarDto`, `ExecucaoIniciarDto`, `UsuarioSenhaAlterarDto`
- Output (past participle): `UsuarioCriadoDto`, `ExecucaoIniciadaDto`, `UsuarioSenhaAlteradaDto`
- Listing output: always `ResumoDto` (e.g. `UsuarioResumoDto`)

**Methods:** `verbo + entidade` — `criarUsuario()`, `listarDemandas()`, `encerrarExecucao()`

**Variables:** never abbreviated — `const usuarioEncontrado`, not `const u`

**Enums:** string enums, value equals name, SCREAMING_SNAKE_CASE — always in `shared/src/enums/`

## Environment Variables

Backend reads all config via injected `ConfigService` — never `process.env` directly.
See `README.md` for the full list of required variables (`DB_*`, `JWT_*`, `ANTHROPIC_*`, `APP_*`).
