# Task 59 — docs: Reconciliação Documental (schema + comportamento)

## Objetivo

Reconciliar a documentação-fonte (`SYSTEM.SPEC.md`, `SCHEMA.md`, `CONTEXT.md`,
`AUDITORIA.md`) com o **estado real e aprovado** do sistema. Um audit read-only
constatou que, em vários pontos, a documentação ficou para trás de mudanças de schema
(tasks 13/38), de comportamento (tasks 40/43/45/46) e do redesenho do ponto (task 29).

**Esta task é puramente documental — não altera código, migrations, DTOs ou
comportamento.** O código já é o estado correto; a doc é que se atualiza.

> **Referência cruzada:** audit de consistência (categorias A, B, D, E2).
> **Overlap:** `backlog/56-demanda-gestor-acesso-total-sem-atribuicao` pode alterar a
> matriz de permissão da demanda; documentar aqui o **estado atual** e referenciar a 56
> como possível atualização futura desse trecho (não antecipar a 56).

---

## Contexto

O código foi avançando por specs (13, 38, 40, 43, 45, 46, 29) e por ajustes diretos,
mas os documentos normativos não acompanharam todos os pontos. Como `SYSTEM.SPEC.md` é
a "constituição" lida no início de cada sessão, divergências ali induzem implementações
erradas. Esta task fecha o débito documental acumulado.

---

## Escopo

> Para cada item: a doc está desatualizada e o **código é a verdade**. Ajustar o texto
> da doc ao que o código/migrations já fazem.

### A. Schema (`SCHEMA.md` + `SYSTEM.SPEC.md`)

#### A1 — Status de demanda
- **Real:** `migration 20240013_alterar_status_demanda.ts` + `shared/src/enums/demanda-status.enum.ts` → `PENDENTE, PLANEJADA, CONCLUIDA`.
- **Doc a corrigir:**
  - `SCHEMA.md` tabela `demanda` (~linha 224): `CHECK (status IN ('PENDENTE','PLANEJADA','CONCLUIDA'))`.
  - `SYSTEM.SPEC.md` §5.4 (bloco `DemandaStatusEnum`, ~linhas 272-276) e §13 tabela Demanda (~linha 1054): substituir `PLANEJADA, EM_DESENVOLVIMENTO, CONCLUIDA` por `PENDENTE, PLANEJADA, CONCLUIDA`.
- **Verificação extra:** após editar, `grep -r "EM_DESENVOLVIMENTO" docs/` só deve sobrar em `AUDITORIA.md`/specs históricas e nas migrations 05/13 (criação + remoção) — nunca como valor vigente.

#### A2 — Coluna `dia_nao_util.duracao`
- **Real:** `migration 20240014_adicionar_duracao_dia_nao_util.ts` adiciona `duracao VARCHAR(20) NOT NULL CHECK (duracao IN ('INTEGRAL','MEIO_PERIODO'))`; enum `shared/src/enums/dia-nao-util-duracao.enum.ts`.
- **Doc a corrigir:**
  - `SCHEMA.md` tabela `dia_nao_util` (~linha 489): adicionar a coluna `duracao` + a constraint. **Nome da constraint:** usar o nome final definido pela task 60 (`chk_dia_nao_util_duracao`) — se a 60 ainda não tiver sido executada, documentar o nome atual `ck_dia_nao_util_duracao` e deixar nota de que a 60 padroniza.
  - `SYSTEM.SPEC.md` §13 tabela DiaNaoUtil (~linha 1119): adicionar `duracao | ENUM | INTEGRAL, MEIO_PERIODO`; §6.2 lista de enums: incluir `dia-nao-util-duracao.enum.ts`.

#### A3 — Migrations 15 e 16
- **Real:** `20240015_seed_usuario_gestor_inicial.ts` (seed idempotente do gestor inicial) e `20240016_renomear_funcao_updated_date.ts` (renomeia `fn_atualizar_updated_date` → `fn_set_updated_date`).
- **Doc a corrigir:** `SCHEMA.md` — onde houver referência à lista/ordem de migrations, registrar as duas. A função `fn_set_updated_date` já está correta no doc (estado final) — só falta o histórico.

### B. Comportamento (`SYSTEM.SPEC.md`)

#### B1 + B2 — Dark mode habilitado e paleta de cores
- **Real:** `frontend/src/app/app.config.ts:45` → `darkModeSelector: '.app-escuro'`; `core/services/tema.service.ts` + `core/models/tema.model.ts`; toggle funcional em `shared/layout/topbar/topbar.component.html:57` (`(click)="tema.alternarTema()"`, sem `[disabled]`). Cores via aliases semânticos `--app-surface-*` (claro/escuro) em `styles.scss`.
- **Doc a corrigir:** §8.5 (~linhas 812-845): trocar "Dark mode: permanentemente desabilitado (`darkModeSelector: false`) — o sistema é sempre claro" por a descrição do tema claro/escuro real; substituir a tabela de uso de cores Tailwind `bg-surface-*`/`text-surface-*` direto pela convenção de aliases `--app-surface-N` (e manter `primary` como acento). Alinhar com a memória de projeto sobre `--app-surface-*`.

#### B3 — Módulo ponto (diário/mensal/todos + meio período)
- **Real:** `ponto.controller.ts` expõe `GET /ponto/diario`, `GET /ponto/todos` (`@GestorOnly`), `GET /ponto/mensal`; `ponto.service.ts` calcula meta por **fração de dia** (`fracaoMeta` 1 / 0.5 / 0) e meio período.
- **Doc a corrigir:** §12 (tabela de módulos, linha `ponto`) e §14 (Intervalos/Dias Não Úteis): registrar os três modos e a regra de meio período (`MEIO_PERIODO` → meta pela metade).

#### B4 + B5 — Matriz de permissão da demanda
- **Real (`demanda.service.ts`):** desenvolvedor só cria **sub-demanda** (`demandaPaiId` obrigatório, l.54-61); dev vê qualquer demanda de projeto acessível mas só **edita se membro** (`podeEditar`, l.195-197 / l.227-237); `descricaoCliente` exclusiva do gestor (l.239-246); proteção do **último membro** (l.728-731); dev pode **incluir/remover a si mesmo** como membro (l.650-666 / l.714-721).
- **Doc a corrigir:** §14 "Acesso e Permissões" + "Demandas" (~linhas 1132-1153): refletir essas regras. Acrescentar nota: a inclusão/remoção de si mesmo é a exceção à linha "Atribuir usuário manualmente — Dev ❌".
- **Cuidado:** ver overlap com `backlog/56` (gestor acesso total) — documentar o estado atual e referenciar a 56.

#### B6 — Registro manual de execução
- **Real:** `execucao.controller.ts:55-56` `@GestorOnly @Post('registro')`; `execucao.service.ts:77-121` `registrar()` (valida datas e sobreposição; usuário = dono da atividade).
- **Doc a corrigir:** §12 (módulo execucao) e/ou §15: registrar o fluxo de registro manual gestor-only.

#### B7 — Edição de execução altera datas
- **Real:** `execucao.service.ts:234-277` (`PUT /execucao/:id`) altera `descricao`, `inicio_data` e `fim_data`.
- **Doc a corrigir:** §13 tabela Execucao / §14: deixar claro que a edição cobre as datas, não só a descrição.

#### B8 — Código do projeto derivado do nome
- **Real:** `frontend/.../projeto.model.ts` `gerarCodigoDoNome` (task 43) — código auto-preenchido a partir do nome, editável; backend ainda valida unicidade.
- **Doc a corrigir:** §13 tabela Projeto (~linha 1035): ajustar a descrição de `codigo` (derivado do nome, editável); revisar o exemplo "PROJ-001".

#### E2 — Numeração de seções quebrada
- **Doc a corrigir (`SYSTEM.SPEC.md`):** §7 "Arquitetura do Backend" contém `### 8.1 Estrutura de Pastas` → renumerar para `7.1` (e subsequentes 7.x); §9 "Banco de Dados" contém `### 10.4 Configuração de Ambiente` → `9.4`. Conferir a sequência inteira de cada capítulo após a edição.

### D. Contexto (`CONTEXT.md` + `AUDITORIA.md`)

#### D1 — Encerrar task 45 (tema escuro)
- **Real:** spec 45 está em `done/`; toggle habilitado e funcional.
- **Doc a corrigir:** remover/atualizar a narrativa "Task em andamento: 45-frontend-tema-escuro… `[disabled]="true"`… Pendente: remover o `[disabled]`" (~linhas 26-27). A seção "Tasks em Andamento" já diz "Nenhuma" — alinhar a narrativa.

#### D2 — Tabela de migrations
- **Doc a corrigir:** seção "Banco de Dados" (~linhas 198-199): atualizar de "12 + 20240013 + 20240014" para o total real (incluir `20240015`, `20240016` e — quando a task 60 rodar — `20240017`).

#### D3 — Log de decisões obsoleto
- **Doc a corrigir:** entradas que citam `AtividadeAtualizadaDto`/`ExecucaoAtualizadaDto` como aliases re-exportados (~linhas 242, 244) não correspondem ao código atual (renomeados; nenhum alias por re-export existe hoje). Anotar como histórico ou remover.

#### D4 — Errata na auditoria
- **Doc a corrigir:** `docs/AUDITORIA.md` — nota curta de que o relatório é de 2026-06-19 e antecede specs 45/46 e migrations 15/16; os achados C1 (herança de DTO de negócio) e C2 (`ngModel` no seletor-cor) foram identificados depois e endereçados pelas tasks 63 (C1) e 62 (C2).

---

## Atualização de Documentação (obrigatória)

Esta task **é** a atualização de documentação. Garantir consistência cruzada:
- `SYSTEM.SPEC.md` §5.4/§13 ↔ `SCHEMA.md` ↔ enums do `shared` (status de demanda, duração).
- §8.5 ↔ `app.config.ts`/`styles.scss` (tema).
- §12/§14 ↔ controllers/services reais (ponto, execução, demanda).

---

## Verificação

1. `grep -rn "EM_DESENVOLVIMENTO" docs/SYSTEM.SPEC.md docs/SCHEMA.md` — nenhuma ocorrência como valor vigente.
2. `SCHEMA.md` da `dia_nao_util` mostra a coluna `duracao` + constraint.
3. §8.5 não contém mais "permanentemente desabilitado"/"sempre claro".
4. §12/§14 citam `ponto/mensal`, `ponto/todos`, meio período, registro manual de execução, e a matriz de permissão real da demanda.
5. Numeração de seções do `SYSTEM.SPEC.md` contínua (sem `### 8.1` dentro do cap. 7, sem `### 10.4` dentro do cap. 9).
6. `CONTEXT.md` não descreve a task 45 como pendente; tabela de migrations bate com o diretório.
7. **Nenhum** arquivo fora de `docs/` foi tocado (`git status` só lista docs).

---

## NÃO implementar nesta task

- Qualquer mudança de código, DTO, migration ou comportamento — esta task só edita `docs/`.
- A regra de herança de DTO e os DTOs em si (task 63), a padronização de constraints/migration (task 60), os `!`/JSDoc (task 61) e o `ngModel` (task 62) — cada um na sua spec, com seu próprio reforço documental.
- Não antecipar mudanças da `backlog/56` (gestor acesso total) — apenas referenciar.
