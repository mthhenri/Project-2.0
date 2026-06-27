# AUDITORIA.md — Varredura de Conformidade de Padrões

> Relatório produzido pela **task 44 — auditoria-conformidade-padroes**.
> Mede o débito de conformidade do código contra a constituição do projeto
> (`SYSTEM.SPEC.md` §16 e `CONVENTIONS.md`) e o converte em backlog acionável,
> módulo a módulo. **Esta task não altera código de produção** — as correções
> são implementadas nas specs geradas (ver §"Specs de Correção Geradas").

**Data da auditoria:** 2026-06-19
**Escopo varrido:** `shared/`, `backend/src/`, `frontend/src/`, migrations e `docs/`
**Base normativa:** as 25 Proibições Absolutas do `SYSTEM.SPEC.md` §16 + tabela de proibições do `CONVENTIONS.md`

> **Errata (task 69):** este relatório é de **2026-06-19** e **antecede** as specs 45/46 e as migrations `20240015`/`20240016`. Os achados **C1** (herança de DTO de negócio) e **C2** (`ngModel` no seletor de cor) foram identificados depois e endereçados pelas tasks **63** (C1) e **62** (C2).

---

## 1. Metodologia

Cada item do checklist da spec 44 (categorias A–G) foi aplicado sistematicamente
sobre todo o repositório, com varredura mecânica (busca por padrão) complementada
por leitura dirigida dos arquivos suspeitos. Cada achado foi classificado por
**módulo**, **arquivo:linha** e **categoria**, e cruzado com a proibição
correspondente do SPEC.

A varredura confirmou que o projeto está, em sua maior parte, **conforme** — fruto
das tasks de correção dedicadas **19** (nomenclatura) e **20** (eliminação de
primitivos). Os achados abaixo concentram-se em pontos que essas correções **não
alcançaram por completo** e em **duas brechas de documentação** (um padrão ambíguo
e uma contradição interna do SPEC).

---

## 2. Sumário por Módulo

| Módulo | Achados | Categorias | Gera spec? |
|---|---:|---|:---:|
| usuario      | 1 | E | ✅ `48-usuario-correcao-padroes` |
| projeto      | 1 | E | ✅ `49-projeto-correcao-padroes` |
| demanda      | 3 | E | ✅ `50-demanda-correcao-padroes` |
| atividade    | 1 | E | ✅ `51-atividade-correcao-padroes` |
| calendario   | 1 | E | ✅ `52-calendario-correcao-padroes` |
| tag          | 1 | E | ✅ `53-tag-correcao-padroes` |
| ponto        | 3 | B | ✅ `54-ponto-correcao-padroes` |
| core/database | 1 | A | ✅ `55-core-correcao-padroes` |
| **Cross-cutting** (doc) | 1 | C/D | tratado dentro de `48` (ver §5) |
| execucao     | 2 | A | ✅ `56-execucao-correcao-padroes` — **errata, ver §8** |
| autenticacao | 0 | — | ❌ |
| assistente   | 0 | — | ❌ |
| **frontend** (todos os módulos) | 0 | — | ❌ |
| **Total** | **15 + 1 cross-cutting** (revisado — ver §8) | | **9 specs (48–56)** |

## 3. Sumário por Categoria

| Categoria | Descrição | Achados |
|---|---|---:|
| A — Nomenclatura e Linguagem | conceito genérico/arquitetural em português; **+ verbo no meio do complemento em DTO interno (errata §8)** | 4 |
| B — DTOs | padrão de nome de DTO de saída / value-object | 3 |
| C/D — Controllers/Services | contradição documental §7.2 × §16 #21 (cross-cutting) | 1 |
| E — Repositories e SQL | primitivo em assinatura de método de repositório | 7 |
| F — Frontend | — (nenhum achado contra padrão documentado) | 0 |
| G — Regras de Negócio | — (nenhum achado) | 0 |

---

## 4. Achados Detalhados (por módulo)

> Legenda da coluna **Categoria**: letra do checklist da spec 44 / proibição do SPEC §16.

### 4.1 usuario

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/modules/usuario/repositories/usuario.repository.ts:171` | E (§16 #21) | `alterar(id: number, dados: { ... })` recebe o **primitivo `id`** e um **objeto anônimo inline** em vez de um DTO. A task 20 converteu `recuperar(dto)` mas deixou `alterar` com primitivo. | Introduzir `UsuarioAlterarInternoDto` (id + campos opcionais) e mudar a assinatura para `alterar(dto: UsuarioAlterarInternoDto)`, espelhando `ExecucaoAlterarInternoDto`/`ExecucaoRepository.alterar(dto)`. |

### 4.2 projeto

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/modules/projeto/repositories/projeto.repository.ts:189` | E (§16 #21) | `alterar(id: number, dados: Partial<Projeto>)` recebe o **primitivo `id`** e um `Partial<Projeto>` (partial do model) em vez de um DTO. | `alterar(dto: ProjetoAlterarInternoDto)` (id + campos), padrão de `ExecucaoRepository.alterar(dto)`. |

### 4.3 demanda

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/modules/demanda/repositories/demanda.repository.ts:291` | E (§16 #21) | `alterar(id: number, dados: Partial<Demanda>)` — primitivo `id` + `Partial<Demanda>`. | `alterar(dto: DemandaAlterarInternoDto)`. |
| `backend/src/modules/demanda/repositories/demanda.repository.ts:268` | E (§16 #21) | `listarAtribuidas(usuarioId: number)` — primitivo `usuarioId` em assinatura de repositório. | `listarAtribuidas(dto: DemandaAtribuidasListarDto)` (`{ usuarioId }`). |
| `backend/src/modules/demanda/repositories/demanda.repository.ts:191-193` | E (§16 #21) | `listar(filtros: DemandaListarDto, usuarioId?: number)` — segundo parâmetro **primitivo** de restrição de escopo (mesmo padrão em `execucao.repository.ts:172`). Borderline: é flag derivada do usuário autenticado. | Documentar o carve-out (parâmetro de restrição de escopo) **ou** embutir em um DTO de filtro. Ver §5. |

### 4.4 atividade

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/modules/atividade/repositories/atividade.repository.ts:197` | E (§16 #21) | `alterar(id: number, dados: Partial<Atividade>)` — primitivo `id` + `Partial<Atividade>`. | `alterar(dto: AtividadeAlterarInternoDto)`. |

### 4.5 calendario

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/modules/calendario/repositories/calendario.repository.ts:103` | E (§16 #21) | `alterar(id: number, dados: Partial<DiaNaoUtil>)` — primitivo `id` + `Partial<DiaNaoUtil>`. | `alterar(dto: CalendarioAlterarInternoDto)`. |

### 4.6 tag

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/modules/tag/repositories/tag.repository.ts:89` | E (§16 #21) | `alterar(id: number, dados: Partial<Tag>)` — primitivo `id` + `Partial<Tag>`. | `alterar(dto: TagAlterarInternoDto)`. |

### 4.7 ponto

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `shared/src/dtos/ponto/PontoDiarioDto.ts` | B (§5.1) | DTO de **saída** sem verbo no particípio (`...DiarioDto`). O SPEC define o padrão `Entidade + Complemento? + Verbo + Dto` para CRUD, mas **não documenta** a nomenclatura de DTOs de **relatório/consulta computada**. | Documentar a convenção para DTOs de relatório (ver §"Atualização de Documentação" da spec 54) e, conforme a decisão, padronizar o nome. |
| `shared/src/dtos/ponto/PontoMensalDto.ts` | B (§5.1) | Idem — DTO de saída de relatório mensal sem verbo. | Idem. |
| `shared/src/dtos/ponto/IntervaloDto.ts` | B (§5.1) | **Value-object** (`{ inicioData, fimData, duracaoMinutos }`) fora do padrão `Entidade + Verbo + Dto`. O SPEC não documenta a nomenclatura de value-objects/sub-estruturas. | Documentar a convenção de value-object DTO; manter ou renomear conforme a regra escrita. |

### 4.8 core / database

| Arquivo:Linha | Categoria | Violação | Correção sugerida |
|---|---|---|---|
| `backend/src/database/migrations/20240001_criar_funcao_updated_date.ts:5,17` | A (§16 #12) | A função/trigger `fn_atualizar_updated_date()` mantém o campo **genérico** de BaseEntity `updated_date`, mas é nomeada com o verbo **português** `atualizar` — conceito genérico/arquitetural deve ser inglês. Mistura idiomas no mesmo identificador (`atualizar` + `updated_date`). | Renomear para nome inglês (ex.: `fn_set_updated_date` / `fn_touch_updated_date`) numa migration nova, atualizando os triggers que a referenciam. |

---

## 5. Achado Cross-Cutting — Contradição Documental §7.2 × §16 #21

Durante a varredura constatou-se que **todas** as services de CRUD recebem o
identificador como **primitivo** (`recuperar(id: number)`, `alterar(id: number, dto)`,
`excluir(id: number)` em `usuario`, `projeto`, `demanda`, `atividade`, `execucao`,
`calendario`, `tag`).

Isso **não é um desvio isolado**, mas uma **contradição interna da constituição**:

- **`SYSTEM.SPEC.md` §16 #21** — "Nunca passar primitivos como parâmetros em métodos
  de service ou repository — sempre DTO, mesmo que seja um único campo".
- **`SYSTEM.SPEC.md` §7.2** (exemplo de controller de referência) — mostra
  explicitamente `this.usuarioService.alterar(id, dto)` e
  `this.usuarioService.recuperarPorIdentificador(id)`, **passando o primitivo `id`**
  extraído de `@Param('id', ParseIntPipe)` para a service.

O código segue o §7.2 no boundary controller→service. Como há **duas regras
documentadas em conflito**, o boundary de service **não** é tratado nesta auditoria
como violação por módulo (evitando ruído); o que é flagrado por módulo é o **boundary
de repositório** (§4), onde a task 20 já estabeleceu `recuperar(dto)` e o
`ExecucaoRepository.alterar(dto)` comprova o padrão alvo — tornando os `alterar(id, ...)`
remanescentes inconsistências inequívocas.

**Resolução:** a reconciliação documental (decidir e escrever de forma inequívoca
se o boundary de service aceita o `id` de `@Param` ou exige DTO, alinhando §7.2 e
§16 #21) é atribuída à spec **`48-usuario-correcao-padroes`** (módulo canônico), e
referenciada pelas demais specs de backend.

---

## 6. Módulos Auditados e Considerados Conformes (sem spec)

Transparência sobre o que **passou** na varredura — para não gerar ruído no backlog:

- **execucao** — `ExecucaoRepository.alterar(dto)` é a **referência estrutural** do
  padrão DTO-only no boundary de repositório. ⚠️ **Correção (errata §8):** os *nomes*
  `ExecucaoAlterarInternoDto`/`ExecucaoEncerrarInternoDto` **violam** o §5 (verbo antes de
  `Interno`); execucao **não** é "0 achados" — ver spec `56`. O `id` primitivo na service
  é o item cross-cutting do §5, não um desvio do módulo.
- **autenticacao / assistente** — sem CRUD de entidade; assinaturas já em DTO; sem SQL fora de padrão.
- **frontend (todos os módulos)** — varredura **negativa** confirmada em:
  `NgModule` (0), `Subject`/`BehaviorSubject` (0), `ngModel`/template-driven (0),
  arquivos `.css` (0), `style=""` inline (0), seletores de ID em SCSS (0), rotas sem
  `loadComponent`/`loadChildren` (0), DTO/enum redefinido localmente (0 — os
  `models/` usam aliases de DTO do shared, **explicitamente permitidos** pelo SPEC §8.1).
  Blocos BEM em português e bem formados. Observação (não flagrada): métodos
  utilitários de UI `atualizarHora`/`atualizarTempo`/`atualizarFlagDescricao` usam o
  verbo `atualizar`, mas **não são métodos de negócio** (refresh de apresentação),
  fora do escopo do §16 #24; renomeá-los é opcional e não gera spec.

### Verificações negativas executadas no backend (todas passaram)

- `is_deleted = false` presente em todo SELECT/EXISTS (114 ocorrências nos repositórios).
- Nenhum `INSERT ... VALUES` (sempre `INSERT ... SELECT ... RETURNING`).
- Nenhum `?` posicional; nenhuma interpolação de **valor** em SQL (interpolações
  existentes são só de **estrutura**: cláusulas `WHERE`/`SET` dinâmicas, `LIMIT/OFFSET`
  e nome de tabela — padrão sancionado pela `BaseRepository` §7.5).
- Nenhum alias abreviado (`a`, `d`, `e`); aliases descritivos / nome completo.
- Nenhum `DEFAULT` em colunas de migration; nenhum campo de data fora do padrão
  `[contexto]_date`/`[contexto]_data` (sem `_at`/`_em`/`data_*`).
- Nenhum `DELETE` físico (sempre `executarSoftDelete()`); nenhum método `existe*`
  (todos `validar*`); nenhum `Atualizar/Atualizado` em DTO/método.
- Controllers sem lógica (sem `if`/`try`/`catch`/acesso a repositório).
- `process.env` apenas em `config.service.ts` (a abstração `ConfigService`) e
  `knexfile.ts` (CLI do Knex, exceção documentada) — nenhum acesso direto fora disso.
- Sem `projeto_usuario`; sem caminho para duas execuções ativas; `DemandaConexao`
  valida ciclo via CTE recursivo antes de inserir.

---

## 7. Specs de Correção Geradas

Uma spec por módulo com pelo menos um achado, numeradas a partir do próximo número
livre do backlog (48). Cada uma fecha o ciclo com **reforço documental** obrigatório.

| Spec | Módulo | Foco |
|---|---|---|
| `docs/specs/backlog/48-usuario-correcao-padroes.spec.md`    | usuario    | `repository.alterar` → DTO + reconciliação documental §7.2 × §16 #21 |
| `docs/specs/backlog/49-projeto-correcao-padroes.spec.md`    | projeto    | `repository.alterar` → DTO |
| `docs/specs/backlog/50-demanda-correcao-padroes.spec.md`    | demanda    | `repository.alterar` + `listarAtribuidas` + `listar` → DTO |
| `docs/specs/backlog/51-atividade-correcao-padroes.spec.md`  | atividade  | `repository.alterar` → DTO |
| `docs/specs/backlog/52-calendario-correcao-padroes.spec.md` | calendario | `repository.alterar` → DTO |
| `docs/specs/backlog/53-tag-correcao-padroes.spec.md`        | tag        | `repository.alterar` → DTO |
| `docs/specs/backlog/54-ponto-correcao-padroes.spec.md`      | ponto      | convenção de nome para DTOs de relatório/value-object |
| `docs/specs/backlog/55-core-correcao-padroes.spec.md`       | core/db    | renomear `fn_atualizar_updated_date` |
| `docs/specs/backlog/56-execucao-correcao-padroes.spec.md`   | execucao   | renomear DTOs internos p/ verbo-no-fim (errata §8) |

---

## 8. Errata (revisão pós-auditoria — 2026-06-20)

Revisão dirigida das specs geradas (48–55) contra o código real expôs **erros da própria
auditoria** na categoria A (Nomenclatura), corrigidos aqui.

### 8.1 Regra de nomenclatura §5 não aplicada a DTOs internos

`SYSTEM.SPEC.md` §5 (linhas 149-155) é explícito: **"o complemento inteiro vem antes do
verbo, sem exceção; qualificadores como `Interno` fazem parte do complemento"** — com o
par ❌ `DemandaMembroAtribuirInternoDto` / ✅ `DemandaMembroInternoAtribuirDto`.

A auditoria **não aplicou** essa regra aos DTOs internos e ainda **propôs a ordem errada**
(`EntidadeAlterarInternoDto`) nas specs 48-53, copiando-a de um exemplar que **ele próprio
viola a regra**.

**Achados de nomenclatura omitidos (categoria A):**

| Arquivo | Atual (❌) | Correto (✅) | Spec |
|---|---|---|---|
| `shared/src/dtos/execucao/ExecucaoAlterarInternoDto.ts`    | `ExecucaoAlterarInternoDto`    | `ExecucaoInternoAlterarDto`    | 56 |
| `shared/src/dtos/execucao/ExecucaoEncerrarInternoDto.ts`   | `ExecucaoEncerrarInternoDto`   | `ExecucaoInternoEncerrarDto`   | 56 |
| `shared/src/dtos/usuario/UsuarioAlterarSenhaInternoDto.ts` | `UsuarioAlterarSenhaInternoDto`| `UsuarioSenhaInternoAlterarDto`| 48 |

Os DTOs internos de demanda (`DemandaMembroInternoAtribuirDto`, `DemandaTagInternoRemoverDto`,
etc.) já estavam **corretos** — são os exemplares de referência de nomenclatura.

### 8.2 execucao não é "0 achados"

O §2 e o §6 classificaram `execucao` como conforme ("0 achados / referência conforme").
**Correção:** execucao tem **2 achados de nomenclatura** (§8.1) e gera a spec **56**.
Permanece a referência **estrutural** (boundary DTO-only), não a de **nomenclatura**.

### 8.3 Specs 48-53 corrigidas

O nome proposto nas specs 48-53 foi corrigido de `EntidadeAlterarInternoDto` (❌) para
`EntidadeInternoAlterarDto` (✅). Na mesma passada, corrigiram-se listas de campo que
divergiam do SET real (defeito independente da nomenclatura):

- **48 usuario** — `UsuarioInternoAlterarDto` passou a incluir `status?` (estava omitido).
- **49 projeto** — `ProjetoInternoAlterarDto` deixou de incluir `codigo?` (campo **não**
  alterável — "Código não pode ser alterado", `projeto.service.ts:114`).
- **50 demanda** — `DemandaInternoAlterarDto` passou a incluir `demandaPaiId?` (reparenting,
  estava omitido).

### 8.4 Tallies revisados

| | Original | Revisado |
|---|---:|---:|
| Achados totais | 12 (+1 cross-cutting) | **15 (+1 cross-cutting)** |
| Categoria A (nomenclatura) | 1 | **4** |
| Specs geradas | 8 (48–55) | **9 (48–56)** |
| Módulos "0 achados" | inclui execucao | **execucao sai da lista** |
