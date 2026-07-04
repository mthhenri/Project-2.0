# Task 90 — Migrations como Arquivos `.sql` Numerados

## Objetivo

Trocar o formato das migrations: em vez de arquivos `.ts` com funções `up`/`down` chamando
`knex.raw()`, cada migration passa a ser um **arquivo `.sql` puro**, nomeado com **número
sequencial de ordem de execução + nome descritivo**, por exemplo:

```
0001 - Criação da tabela usuario.sql
0002 - Criação da tabela projeto.sql
0017 - Seed de tags padrão.sql
```

O SQL dentro do arquivo segue **exatamente** as mesmas regras já usadas no projeto (`SYSTEM.SPEC.md`
§9.1/§9.2, `CONVENTIONS.md` seção SQL) — nada muda na forma como se escreve DDL/DML, só o
**empacotamento** (arquivo `.sql` em vez de módulo `.ts`).

Esta task **inclui a conversão das 27 migrations legadas** (`backend/src/database/migrations/
20240001_*.ts` … `20240027_*.ts`) para o novo padrão — não é só o mecanismo para migrations
futuras, é a migração completa do histórico existente.

---

## Decisão de desenho (confirmada nesta criação da task)

> Estas decisões foram tomadas na criação da spec para deixar o escopo fechado. Se o desenvolvedor
> que for implementar discordar de algum ponto, **alinhar com o usuário antes de começar**.

1. **As 27 migrations legadas são convertidas nesta própria task.** Cada `NNNNNNNN_nome.ts` vira
   `NNNN - Nome Descritivo.sql` (mapeamento completo em §1 do Escopo), preservando **exatamente**
   o mesmo SQL que cada `up`/`down` já executa hoje — é reempacotamento, não reescrita de lógica.
   Os `.ts` são removidos do diretório depois da conversão (git preserva o histórico). Isso exige
   também **realinhar os registros já gravados em `knex_migrations`** em todo ambiente onde essas
   27 já rodaram (dev, e qualquer outro ambiente existente) — ver §6 do Escopo; sem esse passo o
   Knex tentaria reaplicar as 27 do zero contra um schema que já as tem.
2. **Continua usando o Knex como mecanismo de migration** (não um runner do zero). Os comandos
   `npm run db:migrate` / `npm run db:rollback` (`CLAUDE.md`) continuam existindo e com o mesmo
   comportamento externo — o que muda é **de onde o Knex lê as migrations**: em vez do
   `FsMigrations` padrão (um arquivo `.ts` = um módulo com `up`/`down`), um
   **`Knex.MigrationSource` customizado** que lê arquivos `.sql`.
3. **Um arquivo por migration** (bate com o exemplo do pedido). Como o Knex precisa de `up` e
   `down` para dar suporte a `db:rollback`, o arquivo único é dividido em duas seções por
   marcador de comentário, sozinho na linha:

   ```sql
   -- UP

   CREATE TABLE ...

   -- DOWN

   DROP TABLE ...
   ```

   A seção `-- DOWN` é **obrigatória**, salvo justificativa explícita em comentário no próprio
   arquivo — mesmo critério que as migrations `.ts` atuais já seguem (todas têm `up` e `down`,
   nenhuma das 27 fica de fora dessa regra).
4. **Numeração:** inteiro sequencial, zero-padded em 4 dígitos. As 27 legadas assumem `0001`–`0027`
   **na mesma ordem em que já existem** (`20240001` → `0001`, … `20240027` → `0027`) — a numeração
   nova é só uma repadronização do prefixo, a ordem de execução histórica não muda. A **próxima**
   migration a ser criada por qualquer task futura começa em `0028`. Separador entre número e nome:
   `" - "` (espaço, hífen, espaço). Nome descritivo em português, frase legível com inicial
   maiúscula (não kebab-case).
5. **Diretório:** mesmo `backend/src/database/migrations/`. Ao final desta task, **só** existem
   arquivos `.sql` nele (os 27 `.ts` são removidos) — o `MigrationSource` novo não precisa
   reconhecer nem ignorar `.ts`, só varre `/^\d{4} - .+\.sql$/`.
6. **Tabela de controle:** continua sendo a `knex_migrations` (interna do Knex) — não se cria uma
   tabela de controle própria. Como ainda é o Knex quem orquestra `migrate:latest`/`rollback`, ele
   mesmo grava o nome do arquivo aplicado nessa tabela. O detalhe delicado é o **realinhamento**
   dos 27 registros já gravados sob o nome antigo (`20240001_criar_funcao_updated_date.ts`, etc.)
   para o nome novo (`0001 - Criação da função de manutenção de updated_date.sql`) — ver §6.
7. **Transação por migration é automática via Knex — nada de `BEGIN`/`COMMIT`/`ROLLBACK` escrito no
   `.sql`.** Ver §5 do Escopo (é a resposta à pergunta "como o Knex lidaria com isso").
8. **Valores literais em vez de parâmetros nomeados dentro das migrations.** A regra geral do
   projeto (`SYSTEM.SPEC.md` §9.2 #8) — "parâmetros nomeados `:nome`, nunca interpolação" — existe
   para blindar contra SQL injection quando o valor vem de uma requisição HTTP. Migration não tem
   input de usuário: os valores (nomes de tag, feriados, códigos de enum) são constantes escritas
   pelo próprio desenvolvedor no arquivo. Por isso, nesta conversão, os `:nome`/`:cor` etc. que
   hoje chegam via objeto de bind do `knex.raw()` viram **literais SQL diretos** no arquivo `.sql`
   (`'Backend'`, `'#3b82f6'`, …) — sempre escapando aspas simples dobrando-as (`''`) se algum valor
   as contiver. Esta é a **única** exceção à regra de parâmetros nomeados, e só vale dentro de
   `backend/src/database/migrations/` — o runtime (repositórios) continua 100% `:nomeParametro`.

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
`backend/src/core/database/database.provider.ts` (usado em runtime pela aplicação):

```typescript
migrations: {
  directory: './migrations', // ou path.resolve(...)
  extension: 'ts',
}
```

Seis das 27 migrations geram o SQL executado a partir de **loops em TypeScript** sobre arrays de
tabelas/valores (não é SQL estático dentro do template literal — é gerado dinamicamente,
iteração a iteração, sempre sobre dados conhecidos em tempo de escrita, nunca dependentes de
resultado de query): `20240016` (11 tabelas), `20240017` (14 tags), `20240018` (19 tags),
`20240021` (9 feriados), `20240022` (11 tabelas), `20240025` (7 tabelas de referência × seeds +
7 conversões de coluna). Essas exigem **achatamento** (§1 do Escopo) — expandir o loop em SQL
literal, na mesma ordem de iteração do array original, antes de virar `.sql`.

---

## Escopo

### 1. Conversão das 27 migrations legadas

Mapeamento completo — cada linha é uma conversão 1:1, mesmo SQL, só reempacotado:

| Legada (`.ts`) | Nova (`.sql`) | Achatamento de loop? |
|---|---|---|
| `20240001_criar_funcao_updated_date` | `0001 - Criação da função de manutenção de updated_date.sql` | não |
| `20240002_criar_tabela_usuario` | `0002 - Criação da tabela usuario.sql` | não |
| `20240003_criar_tabela_projeto` | `0003 - Criação da tabela projeto.sql` | não |
| `20240004_criar_tabela_tag` | `0004 - Criação da tabela tag.sql` | não |
| `20240005_criar_tabela_demanda` | `0005 - Criação da tabela demanda.sql` | não |
| `20240006_criar_tabela_demanda_usuario` | `0006 - Criação da tabela demanda_usuario.sql` | não |
| `20240007_criar_tabela_demanda_conexao` | `0007 - Criação da tabela demanda_conexao.sql` | não |
| `20240008_criar_tabela_demanda_tag` | `0008 - Criação da tabela demanda_tag.sql` | não |
| `20240009_criar_tabela_atividade` | `0009 - Criação da tabela atividade.sql` | não |
| `20240010_criar_tabela_atividade_tag` | `0010 - Criação da tabela atividade_tag.sql` | não |
| `20240011_criar_tabela_execucao` | `0011 - Criação da tabela execucao.sql` | não |
| `20240012_criar_tabela_dia_nao_util` | `0012 - Criação da tabela dia_nao_util.sql` | não |
| `20240013_alterar_status_demanda` | `0013 - Alteração dos valores de status da demanda.sql` | não |
| `20240014_adicionar_duracao_dia_nao_util` | `0014 - Adição da coluna duracao em dia_nao_util.sql` | não |
| `20240015_seed_usuario_gestor_inicial` | `0015 - Seed do usuário gestor inicial.sql` | não |
| `20240016_renomear_funcao_updated_date` | `0016 - Renomeação da função de updated_date para inglês.sql` | **sim** (11 tabelas) |
| `20240017_seed_tags_padrao` | `0017 - Seed de tags padrão.sql` | **sim** (14 tags) |
| `20240018_seed_tags_padrao_complemento` | `0018 - Seed complementar de tags padrão.sql` | **sim** (19 tags) |
| `20240019_remover_ordem_exibicao` | `0019 - Remoção da coluna ordem_exibicao.sql` | não |
| `20240020_padronizar_nomes_constraints` | `0020 - Padronização dos nomes de constraints.sql` | não |
| `20240021_seed_feriados_nacionais` | `0021 - Seed de feriados nacionais fixos.sql` | **sim** (9 feriados) |
| `20240022_converter_datas_para_timestamptz` | `0022 - Conversão das datas para timestamptz.sql` | **sim** (11 tabelas) |
| `20240023_remover_prioridade_demanda` | `0023 - Remoção da coluna prioridade em demanda.sql` | não |
| `20240024_adicionar_anotacoes_alteracao_data_usuario` | `0024 - Adição da coluna anotacoes_alteracao_data em usuario.sql` | não |
| `20240025_enums_para_tabelas_referencia` | `0025 - Conversão dos enums em tabelas de referência.sql` | **sim** (7 tabelas × seeds + 7 conversões) |
| `20240026_criar_ponto_justificativa` | `0026 - Criação da tabela ponto_justificativa.sql` | não |
| `20240027_adicionar_status_cancelada_demanda` | `0027 - Adição do status Cancelada em tipo_demanda_status.sql` | não |

**Regra de achatamento** (para as 6 marcadas "sim"): expandir o `for`/`.map()` do TypeScript em SQL
literal repetido, **na mesma ordem do array original**, substituindo cada `:paramNomeado` pelo
valor literal daquela iteração (decisão de desenho #8). O array e a ordem de iteração ficam
definidos no próprio arquivo `.ts` antes de ser removido — usar o conteúdo atual como fonte da
verdade ao achatar.

**Exemplo completo de achatamento — `20240016` → `0016 - Renomeação da função de updated_date
para inglês.sql`** (11 tabelas: `usuario`, `projeto`, `tag`, `demanda`, `demanda_usuario`,
`demanda_conexao`, `demanda_tag`, `atividade`, `atividade_tag`, `execucao`, `dia_nao_util`):

```sql
-- UP

CREATE OR REPLACE FUNCTION fn_set_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

DROP TRIGGER IF EXISTS trg_projeto_updated_date ON projeto;
CREATE TRIGGER trg_projeto_updated_date
  BEFORE UPDATE ON projeto
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- ... (repetir o mesmo par DROP TRIGGER / CREATE TRIGGER para tag, demanda, demanda_usuario,
--      demanda_conexao, demanda_tag, atividade, atividade_tag, execucao, dia_nao_util, nesta ordem)

DROP FUNCTION IF EXISTS fn_atualizar_updated_date() CASCADE;

-- DOWN

CREATE OR REPLACE FUNCTION fn_atualizar_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- ... (mesmo padrão para as 10 tabelas restantes, mesma ordem)

DROP FUNCTION IF EXISTS fn_set_updated_date() CASCADE;
```

`20240022` achata da mesma forma (11 tabelas, um `ALTER TABLE ... ALTER COLUMN created_date/
updated_date/deleted_date TYPE timestamptz ...` por tabela no `UP`, o inverso no `DOWN`, mais o
`ALTER TABLE execucao` de `inicio_data`/`fim_data` fora do loop). `20240017`/`20240018` achatam
como uma sequência de `INSERT ... SELECT ... WHERE NOT EXISTS (...)` (um por tag, valores
literais no lugar de `:nome`/`:cor`) no `UP` e `DELETE FROM tag WHERE tag.nome = '...' AND
tag.is_deleted = false` no `DOWN`. `20240021` segue o mesmo padrão para `dia_nao_util`. `20240025`
achata as duas listas (`TABELAS_REFERENCIA`, `CONVERSOES`) na ordem em que aparecem no arquivo
original — é a maior conversão (∼150 linhas de SQL resultante), mas mecânica: cada elemento do
array vira o mesmo bloco de instruções que o loop já executa hoje, sem nenhuma lógica nova.

Validar cada arquivo achatado comparando contra o que o `.ts` original geraria (mesma sequência de
`CREATE`/`ALTER`/`INSERT`/`DROP`, mesmos literais) antes de remover o `.ts`.

### 2. `Knex.MigrationSource` customizado para arquivos `.sql`

Novo arquivo, ex. `backend/src/database/sql-migration-source.ts` (nome técnico/genérico → inglês,
§4 da regra de linguagem — é um mecanismo de infraestrutura, não uma entidade de negócio):

- Implementa a interface `Knex.MigrationSource<string>` (`getMigrations`, `getMigrationName`,
  `getMigration`):
  - `getMigrations()` — lista o diretório de migrations, filtra pelo padrão
    `/^\d{4} - .+\.sql$/`, ordena **pelo prefixo numérico** (não alfabético — importa a partir de
    5 dígitos, embora 4 já bastem por muito tempo) e retorna a lista de nomes de arquivo.
  - `getMigrationName(migration)` — retorna o nome do arquivo (é o que fica gravado em
    `knex_migrations.name`).
  - `getMigration(migration)` — lê o conteúdo do arquivo, separa em `up`/`down` pelos marcadores
    `-- UP` / `-- DOWN` (linha própria, comparação exata após `trim()`), e devolve
    `{ up: (knex) => knex.raw(sqlUp), down: (knex) => knex.raw(sqlDown) }`. Sem seção `-- DOWN`,
    `down` lança erro explícito ao ser chamado.
- Validação de formato na leitura: arquivo sem o marcador `-- UP` é um erro de configuração
  (falha alto e cedo, não silenciosamente).

### 3. Ligar o `MigrationSource` nos dois pontos de configuração do Knex

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

### 4. Convenção de conteúdo do arquivo `.sql`

Modelo de referência (para a próxima migration real, `0027` em diante):

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

Regras que continuam valendo **sem exceção** dentro do arquivo `.sql` (nada novo, só reafirmando
que a troca de formato não afrouxa nada, exceto a exceção pontual da decisão de desenho #8):

- BaseEntity completa (`id`, `created_date`, `updated_date`, `is_deleted`, `deleted_date`) em toda
  tabela nova, sem `DEFAULT` em nenhuma coluna.
- Tabelas/colunas de negócio em português; objetos genéricos (`fn_`/`trg_`) em inglês.
- Prefixos obrigatórios: `pk_`/`fk_`/`uix_`/`ix_`/`chk_`/`trg_`/`fn_` — nunca deixar o Postgres
  auto-gerar nome de constraint.
- Sem alias abreviado; nomes de campo de data seguindo `[contexto]_date`/`[contexto]_data`.
- Migrations de DML (seed) seguem `INSERT ... SELECT ... RETURNING`/`INSERT ... SELECT ... WHERE
  NOT EXISTS` como o resto do sistema — nunca `VALUES`.

### 5. Transação por migration — automática via Knex, nunca escrita no `.sql`

**Requisito:** cada bloco (`-- UP` isolado, ou `-- DOWN` isolado) roda inteiro dentro de uma única
transação — se qualquer instrução do bloco falhar, nenhuma instrução anterior do mesmo bloco fica
aplicada (tudo ou nada). Isso é obtido **de graça** pelo próprio Knex, e é por isso que o arquivo
`.sql` **nunca** deve conter `BEGIN`/`COMMIT`/`ROLLBACK` literais:

- Por padrão (`config.migrations.transaction` não desabilitado — e o `SqlMigrationSource` **não
  deve** desabilitá-lo), o `Migrator` do Knex abre uma transação (`knex.transaction(trx => ...)`)
  **antes** de invocar `up(trx)`/`down(trx)`, passando a **conexão já transacionada** (`trx`) como
  argumento. Se a função resolver sem erro, o Knex emite `COMMIT`; se lançar (qualquer instrução
  SQL falhar), o Knex emite `ROLLBACK` — automaticamente, para cada arquivo.
- Como `getMigration()` do `SqlMigrationSource` devolve `up: (knex) => knex.raw(sqlUp)`, o `knex`
  recebido nessa chamada **já é** o `trx` passado pelo Migrator — basta repassá-lo ao `.raw()`
  (nunca capturar/usar uma conexão fora desse parâmetro).
- `.raw()` sem bindings aceita o texto inteiro do arquivo (múltiplas instruções separadas por `;`)
  numa única chamada — o driver `pg` usa o protocolo *simple query*, que executa várias statements
  em uma única chamada de rede. Isso já é o padrão usado nas migrations `.ts` atuais (ex.
  `ponto_justificativa`: `CREATE TABLE` + `CREATE INDEX` + `CREATE TRIGGER` num único
  `knex.raw()`) — nenhuma mudança de comportamento aqui, só confirmando que a premissa vale.
- **Por isso o arquivo nunca deve ter `BEGIN`/`COMMIT`/`ROLLBACK` escritos:** um `BEGIN` redundante
  dentro de uma transação já aberta gera apenas um `WARNING` do Postgres (é um no-op inofensivo),
  mas um `COMMIT`/`ROLLBACK` explícito **encerraria a transação que o Knex acredita que ainda está
  aberta** — o `COMMIT` que o Knex tenta emitir depois falharia (`no transaction in progress`), e
  qualquer instrução do arquivo posterior ao `COMMIT` manual rodaria **fora** da proteção
  transacional, quebrando exatamente a garantia que este padrão exige.
- **Única exceção prevista:** instruções que o Postgres proíbe dentro de uma transação (ex.:
  `CREATE INDEX CONCURRENTLY`). Para esse caso — não usado em nenhuma das 27 legadas, mas possível
  no futuro —, o arquivo sinaliza com um comentário `-- NO TRANSACTION` logo após `-- UP`/`-- DOWN`,
  e o `SqlMigrationSource` devolve `{ up, down, config: { transaction: false } }` (opção que a API
  de `MigrationSource` do Knex já suporta por migration) só nesse caso.

### 6. Realinhamento de `knex_migrations` para os ambientes onde as 27 já rodaram

As 27 legadas já estão aplicadas (schema já existe) em qualquer ambiente que já rodou
`db:migrate` antes desta task, e `knex_migrations.name` guarda o nome **antigo**
(`20240001_criar_funcao_updated_date.ts`, etc.). Depois da conversão, o `SqlMigrationSource` só
enxerga os nomes **novos** (`0001 - Criação da função de manutenção de updated_date.sql`, etc.) —
sem esse passo, o Knex concluiria que nenhuma das 27 foi aplicada e tentaria rodá-las de novo
contra tabelas que já existem (erro `relation already exists` na primeira, na melhor hipótese).

Ordem obrigatória do corte, em cada ambiente que já tenha as 27 aplicadas:

1. **Antes** de trocar o código para o novo `MigrationSource` (ainda com o Knex apontando para o
   `FsMigrations`/`.ts` de sempre), rodar um script único de realinhamento — `UPDATE
   knex_migrations SET name = '<nome novo>' WHERE name = '<nome antigo>'`, uma linha por migration,
   pelas 27 linhas do mapeamento de §1. Pode ser um script Node/ts-node avulso (não é uma
   migration) ou um `.sql` de administração rodado via `psql`/cliente do banco — não precisa
   passar pelo mecanismo de migration em si.
2. Só então: remover os 27 `.ts`, adicionar os 27 `.sql` convertidos, trocar `knexfile.ts` e
   `database.provider.ts` para o `SqlMigrationSource`.
3. Rodar `npm run db:migrate --workspace=backend`: deve reportar que **não há migrations
   pendentes** (as 27 já contam como aplicadas, agora sob o nome novo).

Esse script de realinhamento é executado **uma vez por ambiente já existente** (dev local, e
qualquer outro ambiente que tenha rodado as migrations antes desta task) — não é reexecutável
depois que os nomes já foram trocados, e não deve virar uma migration em si (ele opera sobre o
metadado de controle, não sobre o schema de negócio).

---

## O que **não** muda

- **Nenhuma tabela/coluna de schema muda de forma alguma** — a conversão é 1:1 do mesmo SQL que já
  roda hoje. O resultado de aplicar as 27 `.sql` novas do zero num banco vazio deve ser
  **byte-a-byte equivalente** (mesmo schema) ao resultado de aplicar as 27 `.ts` antigas.
- O **runtime** da aplicação (repositórios usando `knex.raw()` com parâmetros nomeados) não muda —
  esta task é só sobre o mecanismo de **migration**, não sobre como o backend consulta o banco. A
  exceção de valores literais (decisão de desenho #8) vale **só** para dentro de
  `backend/src/database/migrations/`.
- Os comandos `npm run db:migrate --workspace=backend` / `npm run db:rollback --workspace=backend`
  continuam existindo com o mesmo nome e comportamento externo (`CLAUDE.md` não precisa mudar).

---

## Atualização de Documentação (obrigatória)

1. `SYSTEM.SPEC.md` §9 (Banco de Dados) — nova subseção **9.5 Migrations**: formato do arquivo
   (`NNNN - Nome descritivo.sql`), marcadores `-- UP`/`-- DOWN`, regra de transação automática via
   Knex (§5 do Escopo, resumida), a exceção de valores literais (decisão #8) e o diretório.
2. `CONVENTIONS.md` — bloco novo (perto da seção SQL) com o exemplo de arquivo de migration, a
   regra de nomenclatura do arquivo e o aviso "nunca `BEGIN`/`COMMIT`/`ROLLBACK` no arquivo".
3. `CONTEXT.md` — registrar a conversão das 27 legadas, a troca de mecanismo, e que a próxima
   migration nova começa em `0028`.

---

## Verificação

1. `npm run build --workspace=backend` OK (o `SqlMigrationSource` é código TypeScript novo,
   compilado normalmente — as migrations em si viram `.sql`, fora do build TS).
2. **Ambiente do zero:** com o código **anterior** a esta task, subir um Postgres limpo
   (`npm run db:up` com volume novo) e rodar `db:migrate` (as 27 `.ts`); capturar
   `pg_dump --schema-only` do resultado. Derrubar o banco, subir de novo limpo, trocar para o
   código **desta task** (27 `.sql` + `SqlMigrationSource`) e rodar `db:migrate`; capturar
   `pg_dump --schema-only` de novo. **Os dois dumps devem ser idênticos** (ignorando comentários/
   metadados irrelevantes do dump) — prova que a conversão não alterou o schema resultante.
3. **Ambiente já existente** (com as 27 `.ts` já aplicadas): rodar o script de realinhamento de
   `knex_migrations` (§6), trocar o código, rodar `db:migrate` — deve reportar zero migrations
   pendentes.
4. `db:rollback` reverte a última migration (`0027`) usando a seção `-- DOWN`; reaplicar
   (`db:migrate`) sem erro; repetir para 2–3 migrations do meio do histórico (ex. `0016`, `0025`
   — as duas mais complexas) para validar que o achatamento de loop preservou o `down` corretamente.
5. **Teste da garantia transacional:** com uma migration de teste descartável (não commitada),
   induzir um erro proposital numa instrução do meio do bloco `-- UP` (ex. referenciar uma coluna
   inexistente na 2ª instrução de 3) e confirmar que **nada** daquele bloco fica aplicado (a 1ª
   instrução, que teria sucesso isoladamente, também é revertida) — prova que o `ROLLBACK`
   automático do Knex está funcionando sem `BEGIN`/`COMMIT` manual no arquivo.
6. Nenhum `.ts` remanescente em `backend/src/database/migrations/`; os 27 arquivos `.sql`
   convertidos existem com exatamente os nomes da tabela de §1 do Escopo.
7. Boot da aplicação (`npm run backend:dev`) OK — `database.provider.ts` também referencia o
   `SqlMigrationSource`, então precisa continuar resolvendo a conexão normalmente mesmo sem migrar
   nada em runtime.

---

## NÃO implementar nesta task

- Criar uma migration real de **novo** schema (ex. alterar alguma tabela de negócio) — esta task
  troca o mecanismo e converte o histórico; `0028` fica reservado para a próxima migration de
  schema que surgir em outra task.
- Trocar o cliente de banco — `knex` como executor de runtime continua sendo usado normalmente nos
  repositórios via `knex.raw()` com parâmetros nomeados (a exceção de literais é só para dentro de
  `migrations/`, decisão de desenho #8).
- Criar uma tabela de controle de migrations própria — continua sendo a `knex_migrations` interna
  do Knex.
- Unificar a config duplicada entre `knexfile.ts` e `database.provider.ts` — fora de escopo, só
  replicar o novo `migrationSource` do mesmo jeito que a config atual já é replicada.
- Automatizar o script de realinhamento de `knex_migrations` (§6) como parte do `npm run
  db:migrate` — é um passo manual, único, de corte, documentado no README ou na própria migration
  de realinhamento; não deve rodar implicitamente em toda migração futura.
