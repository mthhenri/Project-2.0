# CONTEXT.md — Project 2.0

> **Leia este arquivo após o SYSTEM.SPEC.md e CONVENTIONS.md.**
> Ele reflete o estado atual do projeto. Ao finalizar uma sessão, atualize as seções
> correspondentes antes de encerrar — a próxima sessão depende dessa informação.

---

## Última Atualização

**Data:** —
**Task concluída:** nenhuma — projeto não iniciado
**Sessão:** —

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

*Nenhuma task implementada ainda.*

---

## Em Andamento

*Nenhuma task em andamento.*

---

## Próxima Task

**`docs/specs/backlog/00-monorepo-docker.spec.md`**

Setup inicial do monorepo com npm workspaces, estrutura de pastas e Docker Compose.

---

## Estrutura de Pastas Atual

```
project-2.0/
  docs/               ✅ criado
  backend/            ⬜ aguardando task 01
  frontend/           ⬜ aguardando task 18
  shared/             ⬜ aguardando task 01
  docker-compose.yml  ⬜ aguardando task 00
  package.json        ⬜ aguardando task 00
```

---

## Módulos do Backend

| Módulo | Status |
|---|---|
| core (base, exceptions, filters, interceptors) | ⬜ pendente |
| config | ⬜ pendente |
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
| Migrations criadas | ⬜ pendente |
| Tabelas no banco | ⬜ pendente |
| Conexão configurada | ⬜ pendente |

---

## Decisões Tomadas

> Decisões registradas ao longo das sessões de implementação.

- Todas as decisões de arquitetura estão documentadas em `docs/SYSTEM.SPEC.md`
- Schema completo em `docs/SCHEMA.md`
- Convenções de código em `docs/CONVENTIONS.md`

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
