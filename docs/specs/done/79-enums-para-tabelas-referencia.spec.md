# Task 79 — Enums como Tabelas de Referência

## Objetivo

Converter **todos** os enums de domínio fechado do banco — hoje armazenados como
`VARCHAR + CHECK` — em **tabelas de referência** (`tipo_<tabela>_<complemento?>`), com a
coluna de negócio passando a ser um `INTEGER` FK para o `id` da tabela de referência.

Os enums TypeScript de `shared/src/enums/` **permanecem** como contrato tipado (espelham os
`codigo`), mas são **renomeados** para casar com a tabela (`TipoUsuarioEnum`, etc. — §0). Fora
o rename, **a regra de negócio de DTOs, services, models e frontend não muda**: a tradução
`codigo ⇄ id` é encapsulada inteiramente no **repositório** (SQL).

> **Regra formalizada na criação desta task:** todo enum é sempre uma tabela
> (`SYSTEM.SPEC.md` §5.4, §9.2 #13, §16 #26; `CONVENTIONS.md`). Esta task alinha o schema
> existente a essa regra.

---

## Decisão de desenho (confirmada)

**FK por id inteiro + manter enum TypeScript.**

- A tabela de referência tem `id SERIAL` (PK). A coluna de negócio vira `INTEGER` FK para esse `id`.
- O enum TS continua sendo a fonte de verdade **tipada** da aplicação; a tabela é seedada com os
  mesmos valores (`codigo`).
- O repositório mapeia `codigo → id` no INSERT/UPDATE (subselect) e `id → codigo` no
  SELECT/RETURNING (JOIN, expondo `codigo AS <campo>`). Nada acima do repositório enxerga o id.

---

## Contexto

Hoje cada enum é uma coluna `VARCHAR(n) NOT NULL CHECK (col IN (...))`. São **7** colunas em
**5** tabelas:

| Tabela | Coluna atual | Enum TS | Valores |
|---|---|---|---|
| `usuario` | `tipo` | `UsuarioTipoEnum` → `TipoUsuarioEnum` | DESENVOLVEDOR, GESTOR |
| `usuario` | `status` | `UsuarioStatusEnum` → `TipoUsuarioStatusEnum` | ATIVO, INATIVO |
| `projeto` | `status` | `ProjetoStatusEnum` → `TipoProjetoStatusEnum` | ATIVO, PAUSADO, CONCLUIDO, CANCELADO |
| `demanda` | `status` | `DemandaStatusEnum` → `TipoDemandaStatusEnum` | PLANEJADA, EM_DESENVOLVIMENTO, CONCLUIDA |
| `atividade` | `status` | `AtividadeStatusEnum` → `TipoAtividadeStatusEnum` | PLANEJADA, PENDENTE, DESENVOLVENDO, DESENVOLVIDA |
| `dia_nao_util` | `tipo` | `DiaNaoUtilTipoEnum` → `TipoDiaNaoUtilEnum` | FERIADO, RECESSO, PONTO_FACULTATIVO |
| `dia_nao_util` | `duracao` | `DiaNaoUtilDuracaoEnum` → `TipoDiaNaoUtilDuracaoEnum` | INTEGRAL, MEIO_PERIODO |

> A coluna "Enum TS" mostra `nome atual → nome novo`: o enum passa a se chamar como a **tabela
> de referência** (PascalCase) + `Enum` (ver Escopo §0).

> **`demanda.prioridade` foi removido do escopo:** o campo `prioridade` da demanda é eliminado
> por completo pela **task 76** (`76-remover-prioridade-demanda`). Esta task não cria
> `tipo_demanda_prioridade`. Execute a 69 **antes** desta; se por algum motivo a 66 rodar
> primeiro, reintroduza a linha `demanda.prioridade → tipo_demanda_prioridade` aqui.

> **Tabela esquecida no pedido original:** além de `projeto`, `demanda`, `atividade` e
> `usuario`, o módulo **calendario** (`dia_nao_util`) tem **dois** enums — `tipo` e `duracao`.
> Ambos entram no escopo.

---

## Escopo

### 0. Renomear os enums TypeScript

O enum TS passa a se chamar como a **tabela de referência** (PascalCase) + `Enum` — sempre
começando por `Tipo`. Renomear, em `shared/src/enums/`, **arquivo + símbolo**:

| Arquivo atual → novo | Símbolo atual → novo |
|---|---|
| `usuario-tipo.enum.ts` → `tipo-usuario.enum.ts` | `UsuarioTipoEnum` → `TipoUsuarioEnum` |
| `usuario-status.enum.ts` → `tipo-usuario-status.enum.ts` | `UsuarioStatusEnum` → `TipoUsuarioStatusEnum` |
| `projeto-status.enum.ts` → `tipo-projeto-status.enum.ts` | `ProjetoStatusEnum` → `TipoProjetoStatusEnum` |
| `demanda-status.enum.ts` → `tipo-demanda-status.enum.ts` | `DemandaStatusEnum` → `TipoDemandaStatusEnum` |
| `atividade-status.enum.ts` → `tipo-atividade-status.enum.ts` | `AtividadeStatusEnum` → `TipoAtividadeStatusEnum` |
| `dia-nao-util-tipo.enum.ts` → `tipo-dia-nao-util.enum.ts` | `DiaNaoUtilTipoEnum` → `TipoDiaNaoUtilEnum` |
| `dia-nao-util-duracao.enum.ts` → `tipo-dia-nao-util-duracao.enum.ts` | `DiaNaoUtilDuracaoEnum` → `TipoDiaNaoUtilDuracaoEnum` |

- Atualizar o barrel `shared/src/enums/index.ts` (7 `export *` apontando para os arquivos novos).
- Atualizar **todos os import sites** do `backend/` e `frontend/` (DTOs, services, models,
  componentes, pipes) para o novo símbolo. É um rename mecânico — **valores e semântica não mudam**.
- **Valores dos enums inalterados** (continuam `DESENVOLVEDOR`, `ATIVO`, etc.) — eles viram os
  `codigo` das tabelas de referência.

> Sugestão de execução: rename por símbolo (find/replace global, símbolo a símbolo), depois mover
> os arquivos e ajustar o barrel; `npm run build` em backend e frontend valida que nenhum import
> ficou órfão.

### 1. Tabelas de referência (7 novas)

Cada uma segue a **BaseEntity** (`id`, `created_date`, `updated_date`, `is_deleted`,
`deleted_date` — sem `DEFAULT`) e tem:

| Coluna | Tipo | Notas |
|---|---|---|
| `codigo` | `VARCHAR(40)` NOT NULL | valor SCREAMING_SNAKE, **igual** ao valor do enum TS |
| `descricao` | `VARCHAR(100)` NOT NULL | rótulo legível (português) |

Tabelas (`tipo_<tabela>_<complemento?>`):

`tipo_usuario`, `tipo_usuario_status`, `tipo_projeto_status`, `tipo_demanda_status`,
`tipo_atividade_status`, `tipo_dia_nao_util`, `tipo_dia_nao_util_duracao`.

Para cada uma:
- Índice único parcial: `uix_<tabela>_codigo ON <tabela>(codigo) WHERE is_deleted = false`
  (mesmo padrão do `uix_usuario_login_ativo`).
- Trigger de BaseEntity: `trg_<tabela>_updated_date` usando `fn_set_updated_date()` (task 55).

**Seeds** (`codigo` → `descricao`), via `INSERT ... SELECT ... RETURNING` (sem `VALUES`,
`created_date`/`updated_date` = `NOW()`, `is_deleted` = `false`):

- `tipo_usuario`: DESENVOLVEDOR→"Desenvolvedor", GESTOR→"Gestor"
- `tipo_usuario_status`: ATIVO→"Ativo", INATIVO→"Inativo"
- `tipo_projeto_status`: ATIVO→"Ativo", PAUSADO→"Pausado", CONCLUIDO→"Concluído", CANCELADO→"Cancelado"
- `tipo_demanda_status`: PLANEJADA→"Planejada", EM_DESENVOLVIMENTO→"Em desenvolvimento", CONCLUIDA→"Concluída"
- `tipo_atividade_status`: PLANEJADA→"Planejada", PENDENTE→"Pendente", DESENVOLVENDO→"Desenvolvendo", DESENVOLVIDA→"Desenvolvida"
- `tipo_dia_nao_util`: FERIADO→"Feriado", RECESSO→"Recesso", PONTO_FACULTATIVO→"Ponto facultativo"
- `tipo_dia_nao_util_duracao`: INTEGRAL→"Integral", MEIO_PERIODO→"Meio período"

### 2. Migration nova

**Arquivo:** `backend/src/database/migrations/20240025_enums_para_tabelas_referencia.ts`
(número fixado pela ordem de execução do backlog — esta é a **última migration de schema**
do lote, depois de `20240020`–`20240024` das specs 70/74/75/76/77. A task 76
(`remover-prioridade-demanda`) já removeu `demanda.prioridade` **antes** desta, por isso o
escopo aqui não inclui `tipo_demanda_prioridade`. Confirmar o maior número aplicado no momento.)
**Não editar migrations já aplicadas.**

**`up`** (ordem importante):
1. Criar as 7 tabelas de referência + índice único + trigger.
2. Seedar as 7 tabelas.
3. Para **cada** coluna de enum nas 5 tabelas de negócio:
   1. `ADD COLUMN <tabela_referencia>_id INTEGER` (nullable nesta etapa).
   2. `UPDATE <tabela_negocio> SET <ref>_id = <ref>.id FROM <tabela_referencia> AS <ref>
      WHERE <ref>.codigo = <tabela_negocio>.<coluna_antiga>` (popula a partir do `VARCHAR`).
   3. `ALTER COLUMN <ref>_id SET NOT NULL`.
   4. Adicionar FK: `fk_<tabela_negocio>_<tabela_referencia>` referenciando `<tabela_referencia>(id)`.
   5. Dropar o `CHECK` antigo da coluna `VARCHAR`.
   6. Dropar o índice antigo da coluna `VARCHAR` (quando existir) e criar
      `ix_<tabela_negocio>_<ref>_id` na nova coluna FK.
   7. `DROP COLUMN <coluna_antiga>`.

**`down`:** reverter na ordem inversa — recriar a coluna `VARCHAR` + `CHECK` + índice antigo,
repopular via JOIN com a tabela de referência (por `id`), dropar a coluna FK e a FK constraint, e
por fim dropar as 7 tabelas de referência (triggers/índices junto).

**Mapeamento coluna → FK / constraint / índice:**

| Tabela.coluna | Coluna FK nova | FK constraint | Índice |
|---|---|---|---|
| `usuario.tipo` | `tipo_usuario_id` | `fk_usuario_tipo_usuario` | `ix_usuario_tipo_usuario_id` (era `ix_usuario_tipo`) |
| `usuario.status` | `tipo_usuario_status_id` | `fk_usuario_tipo_usuario_status` | — (não havia índice) |
| `projeto.status` | `tipo_projeto_status_id` | `fk_projeto_tipo_projeto_status` | `ix_projeto_tipo_projeto_status_id` (era `ix_projeto_status`) |
| `demanda.status` | `tipo_demanda_status_id` | `fk_demanda_tipo_demanda_status` | `ix_demanda_tipo_demanda_status_id` (era `ix_demanda_status`) |
| `atividade.status` | `tipo_atividade_status_id` | `fk_atividade_tipo_atividade_status` | `ix_atividade_tipo_atividade_status_id` (era `ix_atividade_status`) |
| `dia_nao_util.tipo` | `tipo_dia_nao_util_id` | `fk_dia_nao_util_tipo_dia_nao_util` | — |
| `dia_nao_util.duracao` | `tipo_dia_nao_util_duracao_id` | `fk_dia_nao_util_tipo_dia_nao_util_duracao` | — |

> A constraint `chk_demanda_status` / `ck_dia_nao_util_duracao` (vide task 70) some junto, pois
> o `CHECK` é dropado. Se a task 70 já tiver rodado, dropar pelo nome `chk_*`; senão, pelo nome
> auto-gerado. A implementação deve consultar o nome real no banco.

### 3. Backend — repositórios

Reescrever, **apenas nas queries que tocam coluna de enum**, em
`usuario`, `projeto`, `demanda`, `atividade`, `calendario`:

- **INSERT** — trocar o `:campo` do enum por um subselect:
  `(SELECT tipo_usuario.id FROM tipo_usuario WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false)`.
- **SELECT / RETURNING** — JOIN com a tabela de referência expondo o valor do enum:
  `INNER JOIN tipo_usuario ON tipo_usuario.id = usuario.tipo_usuario_id` +
  `tipo_usuario.codigo AS tipo` (alias = nome do campo no model/DTO). Manter
  `AND tipo_usuario.is_deleted = false` (regra SQL #1).
- **UPDATE (`alterar`)** — no SET dinâmico, o ramo do enum vira
  `tipo_usuario_id = (SELECT ... WHERE codigo = :tipo ...)`.
- **Filtros de listagem** por enum (ex.: `usuario.listar` filtra por `tipo`/`status`;
  `demanda`/`atividade` por `status`) passam a comparar pelo JOIN (`tipo_usuario.codigo = :tipo`)
  ou por subselect de id.

**Exemplo (usuario.repository — INSERT):**
```sql
INSERT INTO usuario (login, senha_encriptada, nome_completo, cargo_titulo,
                     tipo_usuario_id, horas_diarias_necessarias, tipo_usuario_status_id,
                     created_date, updated_date, is_deleted)
SELECT :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo,
       (SELECT tipo_usuario.id FROM tipo_usuario
          WHERE tipo_usuario.codigo = :tipo AND tipo_usuario.is_deleted = false),
       :horasDiariasNecessarias,
       (SELECT tipo_usuario_status.id FROM tipo_usuario_status
          WHERE tipo_usuario_status.codigo = :status AND tipo_usuario_status.is_deleted = false),
       NOW(), NOW(), false
RETURNING id, login, nome_completo, cargo_titulo,
          (SELECT codigo FROM tipo_usuario WHERE id = usuario.tipo_usuario_id) AS tipo,
          horas_diarias_necessarias,
          (SELECT codigo FROM tipo_usuario_status WHERE id = usuario.tipo_usuario_status_id) AS status,
          created_date
```
(SELECTs de leitura podem usar `INNER JOIN` em vez de subselect no RETURNING — escolher o que
ficar mais legível por query; alias sempre = nome do campo TS.)

### 4. O que **não** muda (de comportamento)

- **Valores dos enums** — inalterados; viram os `codigo` das tabelas de referência.
- **DTOs** — `tipo`/`status`/`duracao` continuam tipados como o enum (só o **nome**
  do tipo importado muda — ver §0).
- **Models de backend** — mantêm o campo como o enum (o repositório traduz `codigo ⇄ id`).
- **Services** — nenhuma regra de negócio muda (apenas o símbolo do enum importado).
- **Frontend** — nenhum comportamento muda; rótulos seguem vindo dos enums (só o nome do símbolo).

> Atenção: o **rename dos enums TS** (§0) é mecânico mas toca DTOs/services/models/frontend nos
> **import sites**. O que não muda é o **valor** e a **semântica** — não o identificador do tipo.

> As tabelas de referência **não** são expostas via API nesta task (sem novo controller/DTO de
> listagem de tipos) — isso é follow-up opcional.

---

## Atualização de Documentação (obrigatória)

> Os **padrões e proibições** (`SYSTEM.SPEC.md` §5.4, §9.2 #13, §16 #26; `CONVENTIONS.md` seções
> Enums e Proibições) **já foram atualizados na criação desta task**. Restam os documentos de
> **estado do schema**:

1. `SCHEMA.md` — adicionar os 7 `CREATE TABLE` de referência (+ índice único + trigger + seeds) e
   trocar, nas 5 tabelas de negócio, a coluna `VARCHAR + CHECK` pela coluna `INTEGER` FK (+ FK +
   índice renomeado).
2. `SYSTEM.SPEC.md` §13 (Entidades e Campos) — atualizar as linhas das colunas de enum para FK e
   acrescentar as 7 entidades de referência.
3. `CONTEXT.md` — registrar a migration, as 7 tabelas e a decisão "FK por id + enum TS".

---

## Verificação

1. `npm run build --workspace=backend` OK; `npm run build --workspace=frontend` OK.
2. `npm run db:migrate --workspace=backend` aplica a migration; `db:rollback` reverte; reaplicar
   — sem erro e sem perda de dados (valores de enum preservados antes/depois).
3. No banco: as 7 tabelas `tipo_*` existem e estão seedadas; as colunas de negócio são `INTEGER`
   FK (`\d usuario` mostra `tipo_usuario_id` + FK, sem `tipo`/`CHECK`); nenhuma coluna de enum
   restou como `VARCHAR + CHECK`.
4. Smoke de API: criar usuário/projeto/demanda/atividade/dia-não-útil e recuperá-los —
   os campos de enum voltam com o **valor do enum** (não o id) e o filtro de listagem por enum
   funciona.
5. `grep` — nenhum `VARCHAR ... CHECK (... IN (` remanescente para coluna de enum em `SCHEMA.md`
   (fora da migration histórica) e nenhum `CHECK (tipo IN` / `CHECK (status IN` em código.

---

## NÃO implementar nesta task

- Expor as tabelas de referência via API (controller/DTO de listagem de tipos) — follow-up.
- **Remover** os enums TypeScript de `shared/` — eles permanecem como contrato (apenas
  **renomeados** conforme §0).
- Alterar **comportamento/regra** de DTOs, services, models ou frontend — neles, só o rename
  mecânico de import do enum (§0); a lógica de domínio fica intocada.
- Editar in-place migrations já aplicadas.
- Adicionar colunas extras às tabelas de referência (`ordem`, `cor`, etc.) — fora do escopo.
