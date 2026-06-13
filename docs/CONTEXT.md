# CONTEXT.md — Project 2.0

> **Leia este arquivo após o SYSTEM.SPEC.md e CONVENTIONS.md.**
> Ele reflete o estado atual do projeto. Ao finalizar uma sessão, atualize as seções
> correspondentes antes de encerrar — a próxima sessão depende dessa informação.

---

## Última Atualização

**Data:** 2026-06-13
**Task concluída:** 03-migrations
**Sessão:** Migrations — todas as 11 tabelas e trigger updated_date

---

## Stack em Uso

| Camada | Tecnologia | Versão |
|---|---|---|
| Backend | NestJS + TypeScript | — |
| Frontend | Angular | 21 |
| UI | PrimeNG | 21 |
| Banco | PostgreSQL | 16 |
| Query layer | Knex.js | — |
| Monorepo | npm workspaces | — |
| Container | Docker + Docker Compose | — |

---

## Implementado

- **00-monorepo-docker** — `package.json` raiz com npm workspaces, `docker-compose.yml` com PostgreSQL 16, `.env`, `.env.example` e `.gitignore`
- **01-shared-package** — pacote `@project20/shared` com 7 enums de negócio, interfaces `StandardResponse` e `PaginatedResult`, e estrutura de pastas de DTOs (9 módulos, prontos para ser populados)
- **02-backend-scaffold** — projeto NestJS estruturado com `package.json`, `tsconfig.json`, `nest-cli.json`, `knexfile.ts`; módulo `DatabaseModule` com Knex configurado; `main.ts` com `ValidationPipe` e `GlobalPrefix`; 10 módulos de negócio esqueleto; placeholders de `core/` (BaseEntity, BaseRepository, exceções, filtro, interceptor) e `config/`
- **03-migrations** — 12 arquivos de migration Knex criados e executados com sucesso; função `fn_atualizar_updated_date()` + 11 tabelas com campos BaseEntity, CHECKs, índices filtrados por `is_deleted = false` e triggers `updated_date`; fix no `knexfile.ts` para usar `path.resolve(__dirname)` e carregar o `.env` corretamente

---

## Em Andamento

*Nenhuma task em andamento.*

---

## Próxima Task

**`docs/specs/backlog/04-core-module.spec.md`**

---

## Estrutura de Pastas Atual

```
project-2.0/
  docs/               ✅ criado
  backend/            ✅ criado (task 02)
  frontend/           ⬜ aguardando task 18
  shared/             ✅ criado (task 01)
  docker-compose.yml  ✅ criado
  package.json        ✅ criado
  .env                ✅ criado
  .env.example        ✅ criado
  .gitignore          ✅ criado
```

---

## Módulos do Backend

| Módulo | Status |
|---|---|
| core (base, exceptions, filters, interceptors) | ✅ scaffold criado (task 02) |
| config | ✅ scaffold criado (task 02) |
| database (DatabaseModule + Knex) | ✅ implementado (task 02) |
| autenticacao | ⬜ pendente |
| usuario | ⬜ pendente |
| projeto | ⬜ pendente |
| demanda | ⬜ pendente |
| atividade | ⬜ pendente |
| execucao | ⬜ pendente |
| ponto | ⬜ pendente |
| calendario | ⬜ pendente |
| tag | ⬜ pendente |
| assistente | ⬜ pendente |

---

## Módulos do Frontend

| Módulo | Status |
|---|---|
| core (interceptors, guards, signals) | ⬜ pendente |
| shared (components, pipes) | ⬜ pendente |
| autenticacao | ⬜ pendente |
| usuario | ⬜ pendente |
| projeto | ⬜ pendente |
| demanda | ⬜ pendente |
| atividade | ⬜ pendente |
| execucao | ⬜ pendente |
| ponto | ⬜ pendente |
| calendario | ⬜ pendente |
| tag | ⬜ pendente |

---

## Banco de Dados

| Item | Status |
|---|---|
| Migrations criadas | ✅ 12 arquivos (task 03) |
| Tabelas no banco | ✅ 11 tabelas + trigger fn (task 03) |
| Conexão configurada | ✅ DatabaseModule com Knex (task 02) |

---

## Decisões Tomadas

> Decisões registradas ao longo das sessões de implementação.

- Todas as decisões de arquitetura estão documentadas em `docs/SYSTEM.SPEC.md`
- Schema completo em `docs/SCHEMA.md`
- Convenções de código em `docs/CONVENTIONS.md`
- `knexfile.ts` usa `path.resolve(__dirname, '../../../.env')` para carregar o `.env` da raiz corretamente; o path relativo `'../.env'` não funcionava porque o Knex muda o cwd para o diretório do knexfile
- Os arquivos em `core/` (base, exceptions, filters, interceptors) foram criados já com implementação conforme `SYSTEM.SPEC.md`, antecipando a task 04

---

## Problemas Conhecidos

*Nenhum problema conhecido.*

---

## Notas para a Próxima Sessão

- Ler `SYSTEM.SPEC.md` e `CONVENTIONS.md` antes de iniciar
- Verificar a seção "Próxima Task" acima
- Mover a spec de `backlog/` para `active/` antes de implementar
- Após concluir, mover spec de `active/` para `done/` e atualizar este arquivo

---

## Como Atualizar Este Arquivo

Ao finalizar uma sessão, o Claude Code deve:

1. Mover a task de `active/` para `done/`
2. Adicionar o item em **Implementado** com breve descrição
3. Atualizar o status do módulo correspondente (⬜ → ✅)
4. Atualizar **Próxima Task** com a task seguinte do backlog
5. Registrar em **Decisões Tomadas** qualquer decisão relevante feita durante a implementação
6. Registrar em **Problemas Conhecidos** qualquer dívida técnica ou bug identificado
7. Atualizar **Última Atualização** com data e nome da task concluída
