# MEMORY.md — Mapa do Sistema

> **O que este arquivo é:** um índice de **localização**. Ele responde *"onde fica X?"* e
> *"o que eu preciso ler antes de mexer em Y?"*.
>
> **O que este arquivo NÃO é:** ele **nunca copia a regra em si**. Se a regra aparecer aqui e na
> fonte, as duas divergem no primeiro dia em que uma mudar — e a cópia errada é pior que nenhuma.
> Aqui só entram ponteiros. Para *o que é verdade agora*, veja [`CONTEXT.md`](CONTEXT.md).

---

## 1. Onde estão as regras

Estas são as fontes da verdade. Em conflito entre código e documento, **o documento vence**.

| Assunto | Fonte | Ler antes de |
|---|---|---|
| Constituição do projeto — precede tudo | [`docs/SYSTEM.SPEC.md`](../SYSTEM.SPEC.md) | qualquer implementação |
| Convenções de código (referência rápida) | [`docs/CONVENTIONS.md`](../CONVENTIONS.md) | escrever qualquer arquivo |
| Nomenclatura de DTO (fórmula, verbos, `Resumo`, relatórios) | `SYSTEM.SPEC.md` §5.1 e skill `project20-dto-conventions` | criar ou nomear DTO |
| Regras de negócio (acesso, demanda, intervalos, dias não úteis, grafo) | `SYSTEM.SPEC.md` §14 | alterar permissão ou regra de domínio |
| Esquema do banco (tabelas, constraints, histórico de migrations) | [`docs/SCHEMA.md`](../SCHEMA.md) e `SYSTEM.SPEC.md` §9 | tocar schema ou SQL |
| Deploy e ambientes | [`docs/DEPLOY.md`](../DEPLOY.md) | publicar ou mexer em infraestrutura |
| Auditoria de conformidade (relatório de 2026-06-19) | [`AUDITORIA.md`](../specs/done/44-auditoria-conformidade-padroes/AUDITORIA.md) | investigar divergência de padrão antiga |
| Política de specs e artefatos | `SYSTEM.SPEC.md` §3.1 | criar, mover ou anexar spec |
| Skills de agente — onde vivem e o contrato que cumprem | `CLAUDE.md`/`AGENTS.md`, "Sincronização" | criar, corrigir ou revisar qualquer skill |

**Ordem de leitura no início de sessão:** `SYSTEM.SPEC.md` → `CONVENTIONS.md` →
`docs/context/CONTEXT.md`.

## 2. Onde vive o código de cada coisa

| Assunto | Onde vive |
|---|---|
| DTOs, enums, interfaces e validadores compartilhados | `shared/src/{dtos,enums,interfaces,validators}/` (pacote `@project20/shared`) |
| Módulos de negócio do backend (controller → service → repository) | `backend/src/modules/<modulo>/` |
| Base comum, exceções, filtros, interceptors | `backend/src/core/` |
| Configuração (`ConfigService`) | `backend/src/config/` |
| Conexão Knex, migrations `.sql` numeradas e corte de legado | `backend/src/database/` (`migrations/`, `sql-migration-source.ts`) |
| Telas e serviços HTTP do frontend | `frontend/src/app/modules/<modulo>/` |
| Interceptors, guards e estado global | `frontend/src/app/core/` |
| Componentes, diretivas, pipes e layout reutilizáveis | `frontend/src/app/shared/` |
| Estilos globais, tema e Tailwind | `frontend/src/styles.scss`, `frontend/src/app/shared/styles/`, `frontend/tailwind.config.js` |
| Testes (`node:test`, ao lado do código em `*.test.ts`; rode com `npm test`) | `shared/src/validators/`, `backend/src/database/`, `backend/src/modules/ponto/services/` |
| Verificação de organização do repositório (`repo:verificar`) | `scripts/verificar-organizacao.mjs` |
| Mapa de impacto (`npm run impacto`) | `scripts/impacto.mjs`, `scripts/agentes/hook-impacto.mjs` |
| Subagentes (`implementador`, `revisor`, `testador`) | `.claude/agents/` |
| Specs por estado e material da tarefa | `docs/specs/{backlog,active,done}/` |
| Mídia versionada de documentação (permitida pelo `repo:verificar`) | `docs/assets/` |
| Capturas e saídas brutas de verificação (ignorado pelo Git) | `.artifacts/<tarefa>/` |

## 3. Onde está o backlog

O backlog está em `docs/specs/backlog/` **na branch `claude/adotar-kit-base`** (as duas últimas
branches `claude/*` pendentes foram mergeadas nela em 2026-10-16 e passam a existir na `master`
quando essa branch for mergeada). A task 117 (remover a descrição da atividade; era 94) foi concluída em 2026-10-16 e está em `docs/specs/done/`. Para escolher a próxima task, leia `INDEX-revisao-ux.md`.

| Item | Onde |
|---|---|
| Tasks 94–116 (revisão de UI/UX) | `docs/specs/backlog/9[4-9]-*.spec.md` e `1[01][0-9]-*.spec.md` |
| Índice, ordem e dependências das tasks 94–116 | `docs/specs/backlog/INDEX-revisao-ux.md` |
| Spec guarda-chuva e material da revisão (relatório, mockups HTML, análises) | `docs/specs/backlog/revisao-ui-ux.spec.md` e `docs/specs/backlog/revisao-ui-ux/` |
| Prints da revisão (PNG, referência canônica) | `docs/assets/revisao-ui-ux/prints/` |
