# Task 90 — Migrations como Arquivos `.sql` Numerados

## Objetivo

Trocar o formato das migrations **daqui para frente**: em vez de arquivos `.ts` com funções
`up`/`down` chamando `knex.raw()`, cada migration passa a ser um **arquivo `.sql` puro**, nomeado
com **número sequencial de ordem de execução + nome descritivo**, por exemplo:

```
0001 - Criação de tabelas.sql
0002 - Seed de tags padrão.sql
0003 - Adicionar coluna previsão de fim em demanda.sql
```

O SQL dentro do arquivo segue **exatamente** as mesmas regras já usadas no projeto (`SYSTEM.SPEC.md`
§9.1/§9.2, `CONVENTIONS.md` seção SQL) — nada muda na forma como se escreve DDL/DML, só o
**empacotamento** (arquivo `.sql` em vez de módulo `.ts`).

---

## Decisão de desenho (confirmada nesta criação da task)

> Estas decisões foram tomadas na criação da spec para deixar o escopo fechado. Se o desenvolvedor
> que for implementar discordar de algum ponto, **alinhar com o usuário antes de começar** — não
> foi possível confirmar interativamente no momento da criação desta task.

1. **As 26 migrations legadas (`20240001`…`20240026`, formato `.ts` Knex up/down) não são
   tocadas.** Já estão aplicadas em todo ambiente (dev/produção) e continuam registradas em
   `knex_migrations` exatamente como estão — reescrevê-las não traz benefício e arrisca divergir
   do que já rodou. O novo formato vale **a partir da próxima migration** a ser criada.
2. **Continua usando o Knex como mecanismo de migration** (não um runner do zero). Os comandos
   `npm run db:migrate` / `npm run db:rollback` (`CLAUDE.md`) continuam existindo e com o mesmo
   comportamento externo — o que muda é **de onde o Knex lê as migrations**: em vez do
   `FsMigrations` padrão (um arquivo `.ts` = um módulo com `up`/`down`), um
   **`Knex.MigrationSource` customizado** que lê arquivos `.sql`.
3. **Um arquivo por migration** (bate com o exemplo do pedido). Como o Knex precisa de `up` e
   `down` para dar suporte a `db:rollback`, o arquivo único é dividido em duas seções por
   marcador de comentário, nas primeiras colunas da linha:

   ```sql
   -- UP

   CREATE TABLE ...

   -- DOWN

   DROP TABLE ...
   ```

   A seção `-- DOWN` é **obrigatória**, salvo justificativa explícita em comentário no próprio
   arquivo (ex.: migration de seed irreversível) — mesmo critério que as migrations `.ts` atuais
   já seguem (todas têm `up` e `down`).
4. **Numeração:** inteiro sequencial, zero-padded em 4 dígitos, **reiniciando em `0001`** — não é
   o timestamp `YYYYMMDD...` usado nas legadas. É uma numeração própria do novo esquema, sem
   relação com a data-like das antigas. Separador entre número e nome: `" - "` (espaço, hífen,
   espaço). Nome descritivo em português, frase legível com inicial maiúscula (não kebab-case) —
   exatamente como no exemplo do pedido.
5. **Diretório:** mesmo `backend/src/database/migrations/` das legadas. As `.ts` continuam lá como
   histórico; o novo `MigrationSource` as ignora (filtra só `/^\d{4} - .+\.sql$/`), então os dois
   formatos convivem sem conflito. Nenhuma migration nova em `.ts` deve ser criada a partir de
   agora.
6. **Tabela de controle:** continua sendo a `knex_migrations` (interna do Knex) — não se cria uma
   tabela de controle própria. Como ainda é o Knex quem orquestra `migrate:latest`/`rollback`, ele
   mesmo grava o nome do arquivo aplicado nessa tabela.

---

## Contexto

Hoje (`backend/src/database/migrations/*.ts`) cada migration é um módulo TypeScript:

```typescript
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`CREATE TABLE ... `);
}
export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TABLE ... `);
}
```

Carregado pelo `FsMigrations` padrão do Knex, configurado em dois lugares que precisam ficar
sincronizados — `backend/src/database/knexfile.ts` (usado pela CLI `db:migrate`/`db:rollback`) e
`backend/src/core/database/database.provider.ts` (usado em runtime pela aplicação, caso ela
dispare migrations programaticamente):

```typescript
migrations: {
  directory: './migrations', // ou path.resolve(...)
  extension: 'ts',
}
```

O pedido do usuário é que, daqui pra frente, a migration em si seja **só SQL** — sem o envelope
TypeScript — nomeada por ordem de execução + descrição, e que o SQL dentro do arquivo siga o mesmo
padrão já usado no resto do sistema (BaseEntity, sem `DEFAULT`, prefixos `fk_`/`ix_`/`uix_`/`chk_`/
`trg_`/`fn_`, objetos genéricos em inglês, tabelas/colunas de negócio em português, etc.).

---

## Escopo

### 1. `Knex.MigrationSource` customizado para arquivos `.sql`

Novo arquivo, ex. `backend/src/database/sql-migration-source.ts` (nome técnico/genérico → inglês,
§4 da regra de linguagem — é um mecanismo de infraestrutura, não uma entidade de negócio):

- Implementa a interface `Knex.MigrationSource<string>` (`getMigrations`, `getMigrationName`,
  `getMigration`):
  - `getMigrations()` — lista o diretório de migrations, filtra pelo padrão
    `/^\d{4} - .+\.sql$/`, ordena **pelo prefixo numérico** (não alfabético — importa para números
    de 5+ dígitos no futuro, embora 4 dígitos já bastem por muito tempo) e retorna a lista de
    nomes de arquivo.
  - `getMigrationName(migration)` — retorna o nome do arquivo (é o que fica gravado em
    `knex_migrations.name`).
  - `getMigration(migration)` — lê o conteúdo do arquivo, separa em `up`/`down` pelos marcadores
    `-- UP` / `-- DOWN` (linha própria, comparação exata após `trim()`), e devolve
    `{ up: (knex) => knex.raw(sqlUp), down: (knex) => knex.raw(sqlDown) }`. Se não houver seção
    `-- DOWN`, `down` lança erro explícito ao ser chamado (`rollback` desse arquivo específico não
    é suportado) — a ausência da seção só é aceitável com a justificativa em comentário citada na
    decisão de desenho #3.
- Validação de formato na leitura: arquivo sem o marcador `-- UP` é um erro de configuração
  (falha alto e cedo, não silenciosamente).

### 2. Ligar o `MigrationSource` nos dois pontos de configuração do Knex

Ambos passam a usar `migrationSource` em vez de `directory`/`extension`, mantendo o restante da
config (`client: 'pg'`, `connection`, `pool.afterCreate` do fuso horário) intocado:

- `backend/src/database/knexfile.ts` (CLI — `db:migrate`/`db:rollback`)
- `backend/src/core/database/database.provider.ts` (runtime da aplicação)

```typescript
migrations: {
  migrationSource: new SqlMigrationSource(caminhoDoDiretorioDeMigrations),
}
```

> Os dois arquivos já duplicam a config de conexão hoje (fora do escopo desta task refatorar
> isso) — só replicar o mesmo `migrationSource` nos dois, do mesmo jeito que hoje replicam
> `directory`/`extension`.

### 3. Convenção de conteúdo do arquivo `.sql`

Documentar (ver §Atualização de Documentação) o formato esperado, com um exemplo real. Modelo:

```sql
-- UP

CREATE TABLE exemplo_tabela (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  nome          VARCHAR(255) NOT NULL
);

CREATE TRIGGER trg_exemplo_tabela_updated_date
  BEFORE UPDATE ON exemplo_tabela
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_exemplo_tabela_updated_date ON exemplo_tabela;
DROP TABLE IF EXISTS exemplo_tabela CASCADE;
```

Regras que continuam valendo **sem exceção** dentro do arquivo `.sql` (mesmas de sempre — nada
novo, só reafirmando que a troca de formato não afrouxa nada):

- BaseEntity completa (`id`, `created_date`, `updated_date`, `is_deleted`, `deleted_date`) em toda
  tabela nova, sem `DEFAULT` em nenhuma coluna.
- Tabelas/colunas de negócio em português; objetos genéricos (`fn_`/`trg_`) em inglês.
- Prefixos obrigatórios: `pk_`/`fk_`/`uix_`/`ix_`/`chk_`/`trg_`/`fn_` — nunca deixar o Postgres
  auto-gerar nome de constraint.
- Sem alias abreviado; nomes de campo de data seguindo `[contexto]_date`/`[contexto]_data`.
- Migrations de DML (seed, backfill) seguem `INSERT ... SELECT ... RETURNING` como o resto do
  sistema (nunca `VALUES`), quando aplicável a migrations de dado único; seeds em massa via
  múltiplos `INSERT ... SELECT` são aceitáveis desde que sem `VALUES` linha-a-linha idêntico ao
  padrão do repositório.

### 4. Verificação de que o mecanismo funciona (sem migration definitiva)

Esta task só troca o **mecanismo**; não há mudança de schema pendente para empacotar como
`0001 - ....sql` real. A verificação (§Verificação) usa uma migration **descartável** só para
provar o pipeline ponta a ponta, e a remove ao final — a numeração `0001` fica livre para a
**próxima** migration de verdade que alterar o schema.

---

## O que **não** muda

- Nenhuma tabela/coluna de schema é alterada por esta task.
- As 26 migrations `.ts` legadas continuam no diretório, intocadas, e continuam contando como
  aplicadas (`knex_migrations` não é resetada nem migrada).
- O **runtime** da aplicação (repositórios usando `knex.raw()` com parâmetros nomeados) não muda —
  esta task é só sobre o mecanismo de **migration**, não sobre como o backend consulta o banco.
- Os comandos `npm run db:migrate --workspace=backend` / `npm run db:rollback --workspace=backend`
  continuam existindo com o mesmo nome e comportamento externo (`CLAUDE.md` não precisa mudar).

---

## Atualização de Documentação (obrigatória)

1. `SYSTEM.SPEC.md` §9 (Banco de Dados) — nova subseção **9.5 Migrations**: formato do arquivo
   (`NNNN - Nome descritivo.sql`), marcadores `-- UP`/`-- DOWN`, diretório, e a nota de que as
   migrations anteriores a esta task permanecem em `.ts` como histórico congelado.
2. `CONVENTIONS.md` — bloco novo (perto da seção SQL) com o exemplo de arquivo de migration e a
   regra de nomenclatura do arquivo.
3. `CONTEXT.md` — registrar a troca de mecanismo, a decisão de não converter as 26 legadas, e o
   próximo número disponível (`0001`) para a primeira migration real no novo formato.

---

## Verificação

1. `npm run build --workspace=backend` OK (o `SqlMigrationSource` é código TypeScript novo,
   compilado normalmente — só o **conteúdo** das migrations vira `.sql`).
2. Criar um arquivo descartável `0001 - Teste do novo mecanismo.sql` com `-- UP`/`-- DOWN`
   triviais (ex.: `COMMENT ON` em alguma tabela existente e reverter o comentário) — **não
   commitar**. Rodar `npm run db:migrate --workspace=backend`: o Knex aplica **apenas** esse
   arquivo novo (as 26 legadas já constam em `knex_migrations`, não são reaplicadas) e grava o
   nome do arquivo `.sql` na tabela.
3. `npm run db:rollback --workspace=backend`: reverte usando a seção `-- DOWN` do mesmo arquivo.
   Reaplicar (`db:migrate`) sem erro.
4. Confirmar em `knex_migrations` que o `name` gravado é o nome do arquivo `.sql` (com número e
   descrição), não um caminho `.ts`.
5. Remover o arquivo descartável e o registro correspondente de `knex_migrations` ao final do
   teste, deixando o banco exatamente como estava antes da verificação.
6. Conferir que os dois pontos de configuração (`knexfile.ts` e `database.provider.ts`) apontam
   para o mesmo `SqlMigrationSource` e continuam enxergando as migrations pendentes de forma
   idêntica (testar `db:migrate` via CLI **e** validar que a aplicação sobe normalmente, já que o
   `database.provider.ts` também referencia a config de migrations).

---

## NÃO implementar nesta task

- Converter as 26 migrations `.ts` legadas para `.sql` — ficam como estão (decisão de desenho #1).
- Criar uma migration real de schema (ex.: `0001 - Criação de tabelas.sql` com DDL de verdade) —
  esta task troca só o mecanismo; a numeração `0001` fica reservada para a próxima migration de
  schema que surgir em outra task.
- Trocar o cliente de banco (`knex` como executor de runtime continua sendo usado normalmente nos
  repositórios via `knex.raw()`).
- Criar uma tabela de controle de migrations própria — continua sendo a `knex_migrations` interna
  do Knex.
- Unificar a config duplicada entre `knexfile.ts` e `database.provider.ts` — fora de escopo, só
  replicar o novo `migrationSource` do mesmo jeito que a config atual já é replicada.
