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
| Project Desktop (Electron): janela, bandeja, travas e funções puras (task 152) | `desktop/src/` (`main.ts`, `politica-da-janela.ts`, `config.ts`); README em `desktop/README.md` |
| Interceptors, guards e estado global | `frontend/src/app/core/` |
| Componentes, diretivas, pipes e layout reutilizáveis | `frontend/src/app/shared/` |
| Contrato de dialogs de formulário: autofocus, Enter, Ctrl+Enter, dica de atalhos (task 97) | `shared/directives/dialog-formulario.directive.ts` (`p-dialog[dialogFormulario]`) e `shared/components/dialog-dica-atalhos/` |
| Esqueleto na primeira carga, conteúdo esmaecido + barra na recarga, leitura sem overlay global (task 98) | `shared/components/skeleton-lista/`, `shared/components/barra-recarga/`, `.conteudo-recarregando` em `styles.scss`, `comFeedbackProprio()` em `core/interceptors/loading.interceptor.ts` |
| Login (estado lembrado, returnUrl seguro) e topbar (chip de execução ativa, perfil, atalhos `g`+letra) — tasks 94–96 | `modules/autenticacao/pages/login/`, `core/utils/url-retorno.ts`, `core/services/execucao-ativa.service.ts`, `core/interceptors/execucao-ativa.interceptor.ts`, `shared/layout/sidebar/`, `shared/layout/topbar/` |
| Atalhos de teclado (helpers `focoEmCampo`/`haSobreposicaoAberta`), Ponto mensal inline e equipe (tasks 100–101) | `core/utils/atalhos.ts`, `modules/ponto/` |
| Datas no fuso do sistema (`APP_TIMEZONE`): hoje, dia, hora, relógio local do datepicker | `shared/src/utils/fuso-horario.ts` + `ambiente.fusoHorario` (`frontend/src/environments/`) |
| Execuções: contexto, linha ativa, URL e teclado (110) e relatório com auto-preview/IA (111) | `modules/execucao/pages/execucao-historico/`, `modules/execucao/utils/execucao.util.ts`, `modules/relatorio/components/relatorio-execucao-dialog/`, `modules/relatorio/utils/relatorio.util.ts` |
| Chat com a IA: conversa do dia, streaming SSE e cartões de proposta (task 139) | `modules/chat/` (`pages/chat`, `components/proposta-cartao`, `services/chat.service.ts` com o `fetch` do fluxo, `utils/chat.util.ts`) |
| Tags: quick-add, popover de paleta, seleção em lote (task 116) | `modules/tag/` (`pages/tag-listagem`, `components/tag-edicao-dialog`, `utils/tag.util.ts`), `shared/components/seletor-cor/` |
| Calendário: clique no dia, popover, navegação e legenda (task 115) | `modules/calendario/pages/calendario-listagem/`, `modules/calendario/models/dia-nao-util.model.ts` |
| Anotações em drawer com auto-save (task 114) | `modules/usuario/components/usuario-anotacoes-dialog/`, `modules/usuario/utils/anotacoes.util.ts`, `pages/usuario-anotacoes/` (deep-link), `core/services/desfazer.service.ts` |
| Usuários: switch de status, ações diretas, formulário criar/editar e senha gerada (task 113) | `modules/usuario/` (`pages/usuario-listagem`, `components/usuario-formulario-dialog`, `usuario-senha-dialog`, `usuario-cartao`, `utils/usuario-credenciais.util.ts`) |
| Projetos: status inline, busca/filtros, formulário criar/editar e resumo no detalhe (task 112) | `modules/projeto/` (`projeto-status-chip`, `projeto-formulario-dialog`), `demanda/utils/demanda-arvore.util.ts` |
| Demandas: toolbar de filtros, chip de status com popover, árvore com ações no hover e contexto lembrado (tasks 106–109) | `modules/demanda/` (`components/demanda-toolbar`, `demanda-status-chip`, `demanda-grafo`, `demanda-formulario-dialog` (criar e editar), `demanda-detalhe-dialog` (+ `demanda-tags-cabecalho`, `demanda-membros-cabecalho`, `demanda-metricas`), `utils/demanda-filtro.util.ts`, `constants/demanda-cores.constants.ts`) |
| Exclusão com "Desfazer" de 6 s (task 99) | `core/services/desfazer.service.ts`, `shared/components/toast-desfazer/` e `PATCH /<recurso>/:id/restaurar` no backend |
| Estilos globais, tema e Tailwind | `frontend/src/styles.scss`, `frontend/src/app/shared/styles/`, `frontend/tailwind.config.js` |
| Testes (`node:test` em shared/backend/desktop; Vitest no frontend: `*.test.ts` lógica, `*.spec.ts` componente; rode com `npm test`) | `shared/src/validators/`, `backend/src/database/`, `backend/src/modules/*/services/`, `frontend/src/testes/` |
| Testes de integração dos repositories (banco `<DB_NOME>_teste`, fábricas, `testarComBanco`; `npm run test:integracao`) | `backend/src/testes/`, `backend/scripts/executar-testes.mjs` |
| Verificação de organização do repositório (`repo:verificar`) | `scripts/verificar-organizacao.mjs` |
| Mapa de impacto (`npm run impacto`) | `scripts/impacto.mjs`, `scripts/agentes/hook-impacto.mjs` |
| Subagentes (`implementador`, `revisor`, `testador`) | `.claude/agents/` |
| Specs por estado e material da tarefa | `docs/specs/{backlog,active,done,discarded}/` |
| Mídia versionada de documentação (permitida pelo `repo:verificar`) | `docs/assets/` |
| Capturas e saídas brutas de verificação (ignorado pelo Git) | `.artifacts/<tarefa>/` |

## 3. Onde está o backlog

O backlog está em `docs/specs/backlog/` **na branch `claude/adotar-kit-base`** (as duas últimas
branches `claude/*` pendentes foram mergeadas nela em 2026-10-16 e passam a existir na `master`
quando essa branch for mergeada). A task 117 (remover a descrição da atividade; era 94) foi concluída em 2026-10-16 e está em `docs/specs/done/`. Para escolher a próxima task, leia `INDEX-revisao-ux.md`.

| Item | Onde |
|---|---|
| Tasks da revisão de UI/UX: todas concluídas (94–101, 106–109, 112–116 em `docs/specs/done/`) | `docs/specs/backlog/` guarda só o índice e o guarda-chuva |
| Tasks descartadas pelo autor | `docs/specs/discarded/` (hoje vazia: 102–105 e 110/111 foram reativadas e concluídas) |
| Índice, ordem e dependências das tasks 94–116 (97–99 concluídas) | `docs/specs/backlog/INDEX-revisao-ux.md` |
| Spec guarda-chuva e material da revisão (relatório, mockups HTML, análises) | `docs/specs/backlog/revisao-ui-ux.spec.md` e `docs/specs/backlog/revisao-ui-ux/` |
| Prints da revisão (PNG, referência canônica) | `docs/assets/revisao-ui-ux/prints/` |
| Cobertura de testes: guarda-chuva, método comum por camada e tasks 171–187 | `docs/specs/backlog/testes-automatizados.spec.md` |
| Retrato da cobertura em 2026-10-18 (números, lacunas por camada, armadilhas) | `docs/specs/backlog/testes-automatizados/ANALISE.md` |
