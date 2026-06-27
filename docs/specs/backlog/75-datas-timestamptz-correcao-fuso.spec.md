# 75 — Migração das colunas de data para `timestamptz` (correção definitiva de fuso)

**Depende de:** 03 (migrations), 04 (core-module), 05 (config-service), 15 (execucao-module), 16 (calendario-module), 17 (ponto-module)
**Entrega:** correção de raiz do problema de fuso horário: as colunas de data/hora passam a ser `timestamp with time zone` (`timestamptz`) e armazenam **instantes reais** (UTC no banco), com a sessão do banco fixada no fuso da aplicação para que `NOW()` e o bucketing por dia fiquem corretos. Remove o workaround pontual introduzido na correção anterior (`CAST(:agora AS timestamp)`).

> Backend + migration. **Sem mudança de frontend** (a serialização ISO dos instantes já é a mesma que o front consome hoje).

---

## Contexto / verificação do estado atual

Levantamento feito antes de escrever a spec (banco real + código):

- **Hoje todas as colunas de data/hora são `timestamp without time zone`** (naïve, sem fuso). A sessão do banco é `Etc/UTC`. Isso gera duas semânticas conflitantes na **mesma** coluna naïve:
  - `execucao.inicio_data` / `fim_data` são gravadas pela aplicação a partir de uma `Date` JS → o driver `pg` serializa em **hora local do processo Node (BRT)** → a coluna guarda o **relógio de parede BRT** (ex.: `16:16`).
  - `created_date` / `updated_date` / `deleted_date` são gravadas por `NOW()` do banco → guardam o **relógio UTC** (ex.: `19:16`).
- **Sintoma que originou esta task:** a duração de execução **em andamento** fazia `NOW() (UTC) - inicio_data (BRT naïve)`, inflando +3h. Foi aplicado um patch pontual em [execucao.repository.ts](../../../backend/src/modules/execucao/repositories/execucao.repository.ts) trocando `NOW()` por `CAST(:agora AS timestamp)` (relógio do app em frame naïve). **Esse patch é um paliativo** e deve ser **revertido** nesta task (ver abaixo) — ele depende da coluna ser naïve e quebraria sobre `timestamptz`.
- **Colunas de data afetadas** (todas `timestamp without time zone` hoje), em todas as tabelas com BaseEntity + execução:
  - Auditoria (toda tabela): `created_date`, `updated_date`, `deleted_date` — gravadas por `NOW()` → **semântica UTC**.
  - `execucao.inicio_data`, `execucao.fim_data` — gravadas pelo app → **semântica BRT**.
- **Colunas `date` puras (NÃO migrar):** `projeto.inicio_data`, `projeto.previsao_fim_data`, `demanda.previsao_fim_data`, `dia_nao_util.dia_data`. São datas de calendário (sem hora/fuso) e permanecem `date`. `knex_migrations.migration_time` é interno do Knex (já é `timestamptz`) — não tocar.
- **Queries que bucketizam por dia** (ficam sensíveis ao fuso quando `inicio_data` virar `timestamptz`, pois `DATE(timestamptz)`/`::date` extraem no fuso da **sessão**):
  - [execucao.repository.ts:199](../../../backend/src/modules/execucao/repositories/execucao.repository.ts) — `DATE(execucao.inicio_data) = :data`
  - [execucao.repository.ts:284-302](../../../backend/src/modules/execucao/repositories/execucao.repository.ts) — `DATE(execucao.inicio_data)::text`, `BETWEEN`, `GROUP BY DATE(...)`
  - [atividade.repository.ts:135,140](../../../backend/src/modules/atividade/repositories/atividade.repository.ts) — `atividade.created_date::date >= :dataInicio`
  - O calendário opera sobre `dia_nao_util.dia_data` (`date` puro) → **não afetado**.
- **Não existe configuração de fuso da aplicação** hoje (nenhum `process.env.TZ`, nenhuma constante). É preciso introduzir uma, lida via `ConfigService` (regra: backend nunca lê `process.env` direto, exceto o `knexfile.ts` que é CLI).
- **Inserts não precisam mudar:** `inserir`/`registrar` passam `Date` JS; sobre coluna `timestamptz` o `pg` grava o **instante** correto. `NOW()` em `timestamptz` também grava o instante correto. (Hoje a coluna naïve é que truncava o fuso.)

---

## Decisão de arquitetura: fixar o fuso da sessão do banco

A aplicação é **mono-fuso** (Brasil). A abordagem mais limpa e DRY:

1. As colunas viram `timestamptz` → o banco sempre **armazena UTC** e devolve o instante; o front converte para local (como já faz).
2. A **sessão de cada conexão** é fixada no fuso da app (`America/Sao_Paulo`). Com isso:
   - `NOW()` e a aritmética `NOW() - inicio_data` (ambos `timestamptz`) ficam corretos → **o patch `:agora` é revertido para `NOW()`**.
   - `DATE(inicio_data)` / `::date` / `GROUP BY DATE(...)` passam a bucketizar no **dia local (BRT)** automaticamente, sem `AT TIME ZONE` espalhado por query.

> Alternativa (rejeitada): manter sessão em UTC e adicionar `AT TIME ZONE :fuso` em cada query de bucketing. Mais verboso, fácil de esquecer um ponto, e hardcoda o fuso em vários lugares. Preferir fixar a sessão.

---

## Backend

### `config` — fuso horário da aplicação

- Adicionar variável de ambiente **`APP_TIMEZONE`** (ex.: `America/Sao_Paulo`) ao `.env`/`.env.example` e ao `README`.
- Expor no `ConfigService` (ex.: `configService.obter().app.fusoHorario`), seguindo o padrão das demais configs. Default sensato se ausente: `America/Sao_Paulo`.

### `core/database/database.provider.ts` — fixar fuso na conexão

Usar o hook `afterCreate` do pool do Knex para fixar a sessão (vale para todas as conexões do runtime NestJS):

```ts
return Knex({
  client: 'pg',
  connection: { host, port: porta, database: nome, user: usuario, password: senha },
  pool: {
    afterCreate: (conexao: any, done: any) => {
      conexao.query(`SET TIME ZONE '${fusoHorario}'`, (erro: unknown) => done(erro, conexao));
    },
  },
  migrations: { directory: path.resolve(__dirname, '../../database/migrations'), extension: 'ts' },
});
```

- `fusoHorario` vem do `ConfigService`. **Não** interpolar valor de runtime do usuário aqui (é config de servidor, não entrada de request) — aceitável interpolar a config do servidor neste ponto de bootstrap.
- Fazer o mesmo no **`knexfile.ts`** (usado pela CLI de migração), lendo `process.env.APP_TIMEZONE` (o comentário do arquivo já documenta que `process.env` é intencional ali). Garante que as próprias migrations e o bucketing rodem no fuso certo.

### Migration `20240022_converter_datas_para_timestamptz.ts`

Converter **apenas** as colunas de data/hora (não as `date` puras), preservando o instante real de cada uma conforme sua semântica de gravação:

- **`execucao.inicio_data`, `execucao.fim_data`** foram gravadas como **BRT naïve** → reinterpretar como `America/Sao_Paulo`:

```sql
ALTER TABLE execucao
  ALTER COLUMN inicio_data TYPE timestamptz USING inicio_data AT TIME ZONE 'America/Sao_Paulo',
  ALTER COLUMN fim_data    TYPE timestamptz USING fim_data    AT TIME ZONE 'America/Sao_Paulo';
```

- **`created_date` / `updated_date` / `deleted_date`** de **todas** as tabelas foram gravadas por `NOW()` → **UTC naïve** → reinterpretar como `UTC`:

```sql
ALTER TABLE <tabela>
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';
```

  Tabelas com BaseEntity: `usuario`, `projeto`, `demanda`, `demanda_conexao`, `demanda_tag`, `demanda_usuario`, `atividade`, `atividade_tag`, `execucao`, `tag`, `dia_nao_util`. (Conferir a lista real via `information_schema` no momento da implementação; iterar programaticamente é aceitável.)

- **`USING ... AT TIME ZONE 'zone'`** é determinístico (independe do fuso da sessão): interpreta o valor naïve como sendo daquele fuso e produz o instante correto. Corrige de quebra os `created_date` que hoje aparecem +3h quando lidos pelo Node.
- **`down()`**: reverter para `timestamp without time zone` com o `USING` inverso (`... AT TIME ZONE 'America/Sao_Paulo'` para inicio/fim; `... AT TIME ZONE 'UTC'` para auditoria), restaurando o relógio de parede original.
- **Não** alterar a função/trigger `fn_set_updated_date()` — `updated_date = NOW()` sobre `timestamptz` grava o instante correto.
- Seguir o estilo das migrations existentes (Knex, `up`/`down`, SQL via `knex.raw`).

### `execucao.repository.ts` — reverter o paliativo `:agora`

Com `inicio_data`/`fim_data` em `timestamptz` e a sessão em BRT, **reverter** as 3 expressões para `NOW()` e remover o parâmetro `agora`:

- `listar()` (2 ocorrências, total do dia e linha): `COALESCE(execucao.fim_data, CAST(:agora AS timestamp))` → `COALESCE(execucao.fim_data, NOW())`; remover `parametros.agora = new Date();` e o comentário associado.
- `alterar()`: `COALESCE(fim_data, CAST(:agora AS timestamp))` → `COALESCE(fim_data, NOW())`; remover `agora: new Date()` do objeto de parâmetros.

> Importante: **manter** o `CAST(:agora AS timestamp)` sobre coluna `timestamptz` reintroduziria o bug (o cast volta a ser naïve e força coerção UTC). Por isso a reversão é obrigatória nesta migração.

### Bucketing por dia — validar (provável zero mudança de SQL)

Com a sessão em `America/Sao_Paulo`, `DATE(inicio_data)`, `::date` e `GROUP BY DATE(...)` já extraem o **dia local**. Validar (sem alterar, salvo se necessário):

- `execucao.repository.ts` linhas 199, 284, 300-302 (filtro/agrupamento de dia do histórico e do ponto).
- `atividade.repository.ts` linhas 135/140 (`created_date::date`).
- Caso, por decisão de não fixar a sessão, se opte pela alternativa: trocar para `(coluna AT TIME ZONE :fuso)::date` com `:fuso` nomeado. (Não é o caminho recomendado.)

---

## Frontend

**Nenhuma mudança esperada.** Hoje a API já devolve `inicio_data` como instante ISO com `Z` (o Node lê a coluna naïve como local e produz o instante); após a migração o instante é o mesmo, agora correto na origem. O `app-execucao-timer` e o pipe `date` continuam consumindo instantes. **Verificar** que datas/horas exibidas (ponto, histórico de execuções, timer ao vivo) seguem idênticas.

---

## Atualização documental obrigatória

- **`docs/SYSTEM.SPEC.md`** — onde os tipos das colunas de data aparecem como `TIMESTAMP` (ex.: bloco da BaseEntity ~linhas 857-860; tabela `execucao` ~linhas 1114-1115), atualizar para `TIMESTAMPTZ`. Acrescentar uma nota curta na seção de convenções de data (§ datas) explicando: colunas de data/hora são `timestamptz` (UTC no banco), a sessão do banco roda no fuso da aplicação (`APP_TIMEZONE`), e colunas de calendário puro permanecem `DATE`.
- **`docs/CONVENTIONS.md`** — na seção de campos de data, registrar que `[contexto]_date`/`[contexto]_data` com hora são `timestamptz`; `dia_data`/`previsao_fim_data`/`projeto.inicio_data` são `date`.
- **`README.md`** — documentar a variável `APP_TIMEZONE` junto às demais (`DB_*`, `JWT_*`, `ANTHROPIC_*`, `APP_*`).
- **`docs/CONTEXT.md`** — registrar a task concluída e mover o estado conforme o workflow.

---

## Arquivos afetados

```
.env / .env.example / README.md                                   (APP_TIMEZONE)
backend/src/config/** (ConfigService + tipo de config)            (expor fusoHorario)
backend/src/core/database/database.provider.ts                    (pool.afterCreate → SET TIME ZONE)
backend/src/database/knexfile.ts                                  (connection + SET TIME ZONE p/ CLI)
backend/src/database/migrations/20240022_converter_datas_para_timestamptz.ts  (nova)
backend/src/modules/execucao/repositories/execucao.repository.ts  (reverter :agora → NOW())

docs/SYSTEM.SPEC.md  (tipos TIMESTAMP → TIMESTAMPTZ + nota de fuso)
docs/CONVENTIONS.md  (convenção de tipos de data)
docs/CONTEXT.md
```

---

## Verificação

1. `npm run db:migrate --workspace=backend` aplica a `20240020` sem erro; `npm run db:rollback` reverte sem erro (testar ida e volta).
2. `npm run build --workspace=backend` compila sem erros.
3. **Tipos no banco:** `information_schema.columns` mostra `timestamp with time zone` para `execucao.inicio_data/fim_data` e para todos os `*_date` de auditoria; `date` permanece em `projeto.inicio_data`, `*.previsao_fim_data`, `dia_nao_util.dia_data`.
4. **Instante preservado:** uma execução existente cujo início era 16:16 (BRT) continua exibindo **16:16** no front, e a duração da execução em andamento bate com o relógio real (ex.: iniciada há ~1h → ~1h, não 4h).
5. **Bucketing:** uma execução iniciada perto da meia-noite BRT (ex.: 23:30) aparece no **dia local** correto no histórico e no ponto (não no dia seguinte UTC).
6. **`created_date`** de um registro recém-criado, lido pela API, reflete o instante correto (não mais +3h).
7. **Sessão:** `SHOW TimeZone;` numa conexão do app retorna `America/Sao_Paulo`.
8. Tela de execução ativa e timers ao vivo seguem exibindo o tempo correto.

---

## NÃO implementar nesta task

- Converter colunas `date` puras (`projeto.inicio_data`, `*.previsao_fim_data`, `dia_nao_util.dia_data`) — permanecem `date`.
- Suporte a múltiplos fusos por usuário/projeto — a app é mono-fuso; `APP_TIMEZONE` é global.
- Mudança de frontend (apenas verificação de que a exibição não regrediu).
- Alterar a função/trigger `fn_set_updated_date()` — `NOW()` sobre `timestamptz` já é correto.
- Reescrever o histórico do Knex (`knex_migrations`) ou tocar `migration_time`.
- Decidir a política de "execução ativa conta no total" entre histórico e total da atividade — assunto separado (não é fuso).
```
