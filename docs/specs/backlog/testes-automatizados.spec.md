# testes-automatizados.spec.md

> Guarda-chuva da cobertura de testes automatizados do Project 2.0. Origem: pedido do autor em 2026-10-18 ("montar os
> testes de tudo que já existe"). **Não é uma task implementável**: define o método comum e quebra o trabalho nas tasks
> **171–187**. A análise que a sustenta está em [`testes-automatizados/ANALISE.md`](testes-automatizados/ANALISE.md).
> Fecha `PROBLEMS.md` P-001 (parte de testes; o lint continua em `IDEAS.md` I-002) quando a última task terminar.

## Objetivo

Ter, para cada domínio do sistema, testes automatizados que provem as regras de negócio de `docs/SYSTEM.SPEC.md` §12 e
§14 nas quatro camadas onde elas vivem — regra pura, service, repository (SQL real) e tela — de modo que uma regressão de
permissão, de execução, de acesso ou de SQL quebre `npm test` antes de chegar ao autor.

## Decisões (autor, 2026-10-18)

1. Repositories ganham **testes de integração contra PostgreSQL real** (task 171).
2. O frontend ganha **testes de componente**, além da lógica pura (task 172).
3. **Uma task por domínio, backend e frontend juntos**; módulos satélites entram no domínio dono.

## Método comum a toda task de domínio (174–187)

Cada task de domínio cobre o que se aplica entre as camadas abaixo e, para o que deixar de fora, diz por quê no fecho.

| Camada | Onde | Como | O que provar |
|---|---|---|---|
| **Regra pura** | `domain/`, `utils/` | `node:test`, sem dublê | entradas de borda, datas no fuso `APP_TIMEZONE` |
| **Service** | `services/` | dublê de repository no padrão atual (`Object.create(Service.prototype)` + campos), sem Nest | **cada linha da tabela de permissões §14** que o domínio toca, cada `BusinessException`/`ResourceNotFoundException`/`UnauthorizedAccessException`, e que nada é gravado quando a regra recusa |
| **Repository** | `repositories/` | integração no banco de teste da task 171 (`*.integracao.test.ts`) | `is_deleted = false` em toda leitura, soft delete, filtros de acesso, CTEs, ordenação, transações e unicidades **do próprio SQL** |
| **Controller** | `controllers/` | leitura dos metadados (`Reflect.getMetadata`) das rotas | cada rota tem o decorator de permissão esperado (`@GestorOnly`, `@AdministradorOnly`, `@Public`) e repassa o DTO certo; sem subir a aplicação |
| **Executor / ferramenta da IA** | `executores/`, `ferramentas/` | dublê das services, padrão dos testes existentes | permissão por tipo, validação da entrada, desfazer, compensação |
| **Frontend lógica** | `*.util.ts`, services HTTP, guards, interceptors, pipes | `node:test` + `tsx` (já existe) | regra de tela, montagem de URL/corpo da requisição, redirecionamentos |
| **Frontend componente** | `*.component.ts`, `*.page.ts` | infraestrutura da task 172 | estados vazio, carregando, cheio e erro; validação e envio de formulário; o que aparece ou some por tipo de usuário; interações que disparam service |

Regras da cobertura:

- **Teste de comportamento, não de implementação.** Nada de conferir SQL por string nem quantas vezes um método privado
  rodou; confere o efeito (o que voltou, o que foi gravado, o que foi recusado).
- **A fonte de verdade é o documento.** O teste afirma o que `SYSTEM.SPEC.md`/`SCHEMA.md` dizem. Se o código diverge, o
  teste fica marcado com `{ todo: 'P-0NN' }` apontando para um item novo de `PROBLEMS.md`, e a correção **não** entra na
  task de testes (vai ao autor).
- **Código de produção não muda**, exceto um ponto de injeção mínimo quando algo é intestável (por exemplo, relógio ou
  `new Date()` embutido). Toda mudança dessas é listada no fecho e passa por `gerenciamento-de-impacto`.
- Componente puramente visual, sem estado nem lógica, não precisa de teste de componente; a task lista quais pulou.
- Nomes de teste em português, descrevendo a regra (`'desenvolvedor não inicia execução de atividade de outro'`).
- Testes ao lado do código; integração em `*.integracao.test.ts`, componente na convenção que a task 172 definir.

## Tasks

| # | Task | Domínio / escopo |
|---|---|---|
| 171 | [Banco de teste para repositories](../done/171-testes-banco-de-teste-para-repositories.spec.md) | infraestrutura backend |
| 172 | [Testes de componente e frontend no CI](../done/172-testes-componente-angular-e-frontend-no-ci.spec.md) | infraestrutura frontend, raiz e CI |
| 173 | [Núcleo: core, config, shared e desktop](../done/173-testes-nucleo-core-config-shared-desktop.spec.md) | transversal |
| 174 | [Autenticação e usuários](../done/174-testes-autenticacao-e-usuarios.spec.md) | `autenticacao`, `usuario` |
| 175 | [Projetos](../done/175-testes-projetos.spec.md) | `projeto` |
| 176 | [Demandas](../done/176-testes-demandas.spec.md) | `demanda` |
| 177 | [Atividades e prioridade](../done/177-testes-atividades-e-prioridade.spec.md) | `atividade`, `atividade-prioridade` |
| 178 | [Execuções](178-testes-execucoes.spec.md) | `execucao` |
| 179 | [Ponto e justificativas](179-testes-ponto-e-justificativas.spec.md) | `ponto`, `ponto-justificativa` |
| 180 | [Calendário](180-testes-calendario.spec.md) | `calendario` |
| 181 | [Tags](181-testes-tags.spec.md) | `tag` |
| 182 | [Anotações (pad)](182-testes-anotacoes.spec.md) | `anotacao` |
| 183 | [Relatório](183-testes-relatorio.spec.md) | `relatorio` |
| 184 | [Camada de IA](184-testes-camada-de-ia.spec.md) | `ia`, `configuracao-ia`, `prompt`, `ferramenta-ia`, `proposta-ia`, `assistente` |
| 185 | [Chat](185-testes-chat.spec.md) | `chat` |
| 186 | [Check-in](186-testes-checkin.spec.md) | `checkin` |
| 187 | [Frontend: núcleo e componentes compartilhados](187-testes-frontend-nucleo-e-compartilhados.spec.md) | `frontend/src/app/core`, `shared`, layout |

**Ordem:** 171 e 172 primeiro (independentes entre si); depois 173; depois os domínios, começando pelos de maior risco de
regra — **178** (execução), **176** (demanda), **174** (usuários/permissão), **175**, **177** — e então os demais em
qualquer ordem. A parte de **unidade** de uma task de domínio não depende de 171/172 e pode ser feita antes; a task só
fecha com as quatro camadas.

## Critérios de Aceite da guarda-chuva

- As 17 tasks em `docs/specs/done/`.
- `npm test` na raiz roda shared, backend (unidade), desktop, frontend (lógica e componente) e scripts; a integração roda
  por um comando próprio documentado e no CI.
- Cada linha da tabela de permissões de `SYSTEM.SPEC.md` §14 tem ao menos um teste que a prova (a task 187, última,
  confere a tabela inteira e lista o teste de cada linha no relatório de fecho dela).
- `PROBLEMS.md` P-001 reescrito: a parte de testes removida, a de lint mantida.

## Fora de Escopo

- **Lint/Prettier** (`IDEAS.md` I-002) — continua ideia aberta.
- **Testes ponta a ponta** (Playwright) — o autor escolheu componente, não E2E; a verificação ao vivo continua na skill
  `verify`.
- Meta numérica de cobertura (%) como gate; a cobertura é medida (task 172) e relatada, não bloqueia.
- Corrigir defeitos achados pelos testes (vão a `PROBLEMS.md` e ao autor).
- Testar OpenSearch/Elasticsearch reais.

## Dependências

`docs/SYSTEM.SPEC.md` (§7, §9, §10, §12, §14), `docs/SCHEMA.md`, `docs/CONVENTIONS.md`. Tasks de UI em andamento no
mesmo domínio (hoje a **105**, em `active/`, mexe na tela de atividade) terminam antes da parte de componente do domínio.
