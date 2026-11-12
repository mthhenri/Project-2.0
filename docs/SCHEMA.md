# SCHEMA.md — Project 2.0

> Schema SQL completo do banco de dados PostgreSQL 16.
> Este arquivo reflete o estado atual das tabelas e deve ser atualizado sempre que uma migration alterar a estrutura.
> Migrations ficam em `backend/src/database/migrations/`.

> **Histórico de migrations além das 12 de criação (`20240001`–`20240012`):**
> - `20240013_alterar_status_demanda` — status de demanda para `PENDENTE, PLANEJADA, CONCLUIDA`.
> - `20240014_adicionar_duracao_dia_nao_util` — coluna `dia_nao_util.duracao` (`INTEGRAL` / `MEIO_PERIODO`).
> - `20240015_seed_usuario_gestor_inicial` — seed idempotente do gestor inicial.
> - `20240016_renomear_funcao_updated_date` — renomeou a função dos triggers de `updated_date`; a migration `0085` removeu triggers e função (spec 277).
> - `20240017`/`20240018_seed_tags_padrao(_complemento)` — seed de tags padrão.
> - `20240019_remover_ordem_exibicao` — remove `ordem_exibicao` de `demanda` e `atividade`.
> - `20240020_padronizar_nomes_constraints` — renomeia `demanda_status_check` → `chk_demanda_status` e `ck_dia_nao_util_duracao` → `chk_dia_nao_util_duracao` (alinha ao prefixo `chk_`; estado final já refletido abaixo).
> - `20240021_seed_feriados_nacionais` — seed idempotente dos 9 feriados nacionais de data fixa em `dia_nao_util` (`recorrente = true`, `tipo = FERIADO`, `duracao = INTEGRAL`; idempotência por mês/dia). Feriados móveis ficam de fora.
> - `20240022_converter_datas_para_timestamptz` — converte as colunas de data/hora das 11 tabelas com BaseEntity para `timestamptz` (instante UTC; sessão do banco no fuso da app).
> - `20240023_remover_prioridade_demanda` — remove a coluna `demanda.prioridade` e o índice `ix_demanda_prioridade` (conceito de prioridade descontinuado).
> - `20240024_adicionar_anotacoes_alteracao_data_usuario` — adiciona `usuario.anotacoes_alteracao_data TIMESTAMPTZ` (nullable, sem `DEFAULT`); carimba a data da última alteração das anotações.
> - `20240025_enums_para_tabelas_referencia` — converte os 7 enums (`VARCHAR + CHECK`) em **tabelas de referência** `tipo_*` (`codigo` + `descricao`); as 5 tabelas de negócio passam a usar `INTEGER` FK (`tipo_usuario_id`, `tipo_usuario_status_id`, `tipo_projeto_status_id`, `tipo_demanda_status_id`, `tipo_atividade_status_id`, `tipo_dia_nao_util_id`, `tipo_dia_nao_util_duracao_id`). Enums TS de `shared/` renomeados (`TipoUsuarioEnum`, …) e mantidos como contrato; o repositório traduz `codigo ⇄ id` no SQL.
> - `0028 - Remoção da coluna descricao em atividade` — remove `atividade.descricao` (task 117); o `DOWN` recria a coluna como `TEXT` nullable. (A partir da task 90 os arquivos são `NNNN - Nome.sql` em `backend/src/database/migrations/`; a lista acima mantém os nomes legados `2024xxxx`.)

---

## Convenções deste Schema

**Nomenclatura de objetos de banco.** Todo objeto segue o padrão `<prefixo>_<tabela>_<proposito>`,
com prefixo por tipo de objeto. Os nomes são genéricos/arquiteturais (inglês); apenas tabelas e
colunas de negócio permanecem em português.

| Objeto | Prefixo | Exemplo |
|---|---|---|
| Primary key | `pk_` | `pk_usuario` |
| Foreign key | `fk_` | `fk_demanda_projeto` |
| Unique index | `uix_` | `uix_usuario_login_ativo` |
| Index | `ix_` | `ix_demanda_status` |
| Check constraint | `chk_` | `chk_execucao_periodo_valido` |
| Function | `fn_` | `fn_chat_texto_busca` (não se criam novas) |

**Sem DEFAULT em nenhuma coluna.** Todo valor deve ser fornecido explicitamente pela aplicação.
Defaults implícitos escondem validações e permitem que dados inválidos entrem no banco sem passar pela service.

**Sem aliases abreviados em queries.** Aliases devem ser nomes descritivos completos.
`a`, `d`, `e`, `du` são proibidos. Use `atividade`, `demanda`, `execucao`, `demanda_usuario`.
Para self-joins, use aliases descritivos como `demanda_filho`, `demanda_conexao_proxima`.

**Campos de data seguem o padrão `[contexto]_date` (inglês) ou `[contexto]_data` (português).**
Exemplos: `created_date`, `updated_date`, `deleted_date`, `inicio_data`, `fim_data`, `previsao_fim_data`.

---

## Campos BaseEntity

Presentes em todas as tabelas. Nomes em inglês por serem genéricos/arquiteturais.
Sem DEFAULT — a aplicação fornece todos os valores explicitamente no INSERT, e `updated_date = NOW()` em todo UPDATE, exceto na exclusão,
que grava só `is_deleted` e `deleted_date` (o banco não carrega lógica: não há trigger; `is_deleted = true` é registro morto, filtrado em toda leitura).

```sql
id            SERIAL        PRIMARY KEY,
created_date  TIMESTAMP     NOT NULL,
updated_date  TIMESTAMP     NOT NULL,
is_deleted    BOOLEAN       NOT NULL,
deleted_date  TIMESTAMP
```

---

## Ordem de Criação

As tabelas devem ser criadas nessa ordem para respeitar as dependências de FK:

```
1.  usuario
2.  projeto
3.  tag
4.  demanda
5.  demanda_usuario
6.  demanda_conexao
7.  demanda_tag
8.  atividade
9.  atividade_tag
10. execucao
11. dia_nao_util
12. tipo_anotacao, anotacao (migration `0030`)
13. tipo_provedor_ia, configuracao_ia (migration `0033`; `0049` troca as colunas `modelo_*` por `modelos_provedor` e `fallbacks`; `0055` acrescenta `niveis_proposta`; `0079` troca o provedor padrão, os fallbacks, o mapa de modelos e o esforço por **três cadeias, uma por nível**)
14. tipo_prompt, prompt (migration `0034`)
15. tipo_proposta_ia, tipo_proposta_ia_status, proposta_ia (migration `0035`; `0055` acrescenta `aplicada_pela_ia`)
16. tipo_atividade_prioridade e `atividade.tipo_atividade_prioridade_id` (migration `0036`)
17. mensagem_direta_leitura, mensagem_direta_preferencia, mensagem_direta_supervisao (migration `0050`; só dependem de `usuario`) e mensagem_direta_reacao (migration `0083`, task 314; depende de `usuario`)
18. mensagem_direta (migration `0051`, provisória; sem FK, depende só das funções `fn_chat_texto_*` da `0038`)
19. modelagem_grupo, modelagem_tabela (migrations `0052` e `0053`; `modelagem_tabela` referencia `modelagem_grupo`)
20. tipo_grupo, grupo, grupo_membro, grupo_leitura (migration `0087`, task 246; `grupo` referencia `tipo_grupo`, `usuario`, `projeto` e `demanda`; a `0087` também altera `mensagem_direta` e `mensagem_direta_supervisao`, que passam a referenciar `grupo`)
```

---

## Tabelas

### usuario

Usuários do sistema. Podem ser desenvolvedores ou gestores.
Gestores têm acesso irrestrito. Desenvolvedores acessam apenas projetos
onde possuem ao menos uma demanda atribuída via `demanda_usuario`.
`cor_avatar` (migration `0084`, task 316) é a cor da bolinha que a pessoa escolhe para si: `#RRGGBB` maiúsculo, anulável (`NULL` = cor de acento do tema; o padrão mora no frontend, nunca em DEFAULT); a própria pessoa grava por `PUT /usuario/cor` e o gestor pela edição do usuário, e a service do chat a junta às pessoas, conversas e supervisão (nada é gravado na mensagem).
`ativo` diz se o usuário pode entrar e receber atribuições; a migration `0075` trocou por ele a tabela de referência `tipo_usuario_status`, que só tinha `ATIVO` e `INATIVO`.

```sql
CREATE TABLE usuario (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  login                     VARCHAR(100) NOT NULL,
  senha_encriptada          VARCHAR(255) NOT NULL,
  nome_completo             VARCHAR(255) NOT NULL,
  cargo_titulo              VARCHAR(150) NOT NULL,
  horas_diarias_necessarias INTEGER      NOT NULL,
  tipo_usuario_id           INTEGER      NOT NULL
                              CONSTRAINT fk_usuario_tipo_usuario REFERENCES tipo_usuario(id),
  ativo                     BOOLEAN      NOT NULL,
  cor_avatar                VARCHAR(7)
);

CREATE UNIQUE INDEX uix_usuario_login_ativo
  ON usuario(login)
  WHERE is_deleted = false;

CREATE INDEX ix_usuario_tipo_usuario_id
  ON usuario(tipo_usuario_id)
  WHERE is_deleted = false;
```

---

### projeto

Projetos de trabalho. Apenas gestores criam projetos.
Acesso de desenvolvedores é derivado das demandas atribuídas — não existe tabela `projeto_usuario`.

```sql
CREATE TABLE projeto (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  nome              VARCHAR(255) NOT NULL,
  codigo            VARCHAR(50)  NOT NULL,
  cor               VARCHAR(7)   NOT NULL,
  tipo_projeto_status_id INTEGER NOT NULL
                      CONSTRAINT fk_projeto_tipo_projeto_status REFERENCES tipo_projeto_status(id),
  inicio_data       DATE,
  previsao_fim_data DATE
);

CREATE UNIQUE INDEX uix_projeto_codigo_ativo
  ON projeto(codigo)
  WHERE is_deleted = false;

CREATE INDEX ix_projeto_tipo_projeto_status_id
  ON projeto(tipo_projeto_status_id)
  WHERE is_deleted = false;
```

---

### projeto_volume_vigencia

Volume esperado do projeto por mês de início (task 251, migration 0068). Uma linha ativa por projeto e mês; vale até a próxima vigência. Null suspende a definição, zero é um valor definido. A coluna antiga de projeto foi migrada e removida. Sem início informado, a migração usa o mês de criação; projetos excluídos também preservam o valor para restauração.

```sql
CREATE TABLE projeto_volume_vigencia (
  id SERIAL CONSTRAINT pk_projeto_volume_vigencia PRIMARY KEY,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  projeto_id INTEGER NOT NULL CONSTRAINT fk_projeto_volume_vigencia_projeto REFERENCES projeto(id),
  vigencia_inicio_data DATE NOT NULL,
  volume_esperado_horas INTEGER,
  CONSTRAINT chk_projeto_volume_vigencia_volume CHECK (volume_esperado_horas >= 0),
  CONSTRAINT chk_projeto_volume_vigencia_inicio CHECK (EXTRACT(DAY FROM vigencia_inicio_data) = 1)
);
CREATE UNIQUE INDEX uix_projeto_volume_vigencia_mes_ativo
  ON projeto_volume_vigencia (projeto_id, vigencia_inicio_data) WHERE is_deleted = false;
```

---

### tag

Tags de categorização usadas em demandas e atividades.
Apenas gestores criam e atribuem tags.

```sql
CREATE TABLE tag (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  nome  VARCHAR(100) NOT NULL,
  cor   VARCHAR(7)   NOT NULL
);
```

---

### demanda

Demandas pertencem a projetos e podem conter sub-demandas (hierarquia recursiva
via `demanda_pai_id`). Demandas também se conectam em grafo via `demanda_conexao`.
`estrutural = true` indica que a demanda serve como container de outras demandas.

Ao criar uma demanda, o sistema auto-atribui o criador e todos os gestores ativos
via `demanda_usuario`.

`versao` (migration `0070`, task 258) é a trava de versão dos textos, como `plano.versao`: nasce em 1 e todo
`UPDATE` que muda `descricao_tecnica`, `descricao_cliente` ou `documentacao` soma 1 na mesma instrução. A gravação
com versão (`PATCH /demanda/:id/textos`) só vale se a versão do banco ainda for a lida; as demais telas gravam sem
recusar, só sobem o número.

```sql
CREATE TABLE demanda (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  projeto_id        INTEGER      NOT NULL REFERENCES projeto(id),
  demanda_pai_id    INTEGER               REFERENCES demanda(id),
  nome              VARCHAR(255) NOT NULL,
  descricao_tecnica TEXT,          -- Markdown
  descricao_cliente TEXT,          -- Markdown
  documentacao      TEXT,          -- Markdown
  horas_estimadas   INTEGER      NOT NULL,
  tipo_demanda_status_id INTEGER NOT NULL
                      CONSTRAINT fk_demanda_tipo_demanda_status REFERENCES tipo_demanda_status(id),
  estrutural     BOOLEAN      NOT NULL,
  previsao_fim_data DATE,
  versao            INTEGER      NOT NULL,  -- sobe a cada gravação que muda um dos três textos (task 258)
  CONSTRAINT chk_demanda_versao_positiva CHECK (versao >= 1)
);

CREATE INDEX ix_demanda_projeto
  ON demanda(projeto_id)
  WHERE is_deleted = false;

CREATE INDEX ix_demanda_pai
  ON demanda(demanda_pai_id)
  WHERE is_deleted = false AND demanda_pai_id IS NOT NULL;

CREATE INDEX ix_demanda_tipo_demanda_status_id
  ON demanda(tipo_demanda_status_id)
  WHERE is_deleted = false;
```

---

### demanda_usuario

Junction: atribuição de usuários a demandas.
Essa tabela deriva o acesso ao projeto — um desenvolvedor enxerga um projeto
se tiver ao menos uma linha aqui vinculada a uma demanda desse projeto.

Auto-preenchida na criação de demanda: criador + todos os gestores ativos.

```sql
CREATE TABLE demanda_usuario (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  demanda_id  INTEGER NOT NULL REFERENCES demanda(id),
  usuario_id  INTEGER NOT NULL REFERENCES usuario(id)
);

CREATE UNIQUE INDEX uix_demanda_usuario_ativo
  ON demanda_usuario(demanda_id, usuario_id)
  WHERE is_deleted = false;

CREATE INDEX ix_demanda_usuario_usuario
  ON demanda_usuario(usuario_id)
  WHERE is_deleted = false;
```

---

### demanda_conexao

Grafo de conexões entre demandas. Uma conexão pode ser unidirecional
(`bidirecional = false`: origem → destino) ou bidirecional
(`bidirecional = true`: origem ↔ destino).

A service valida via CTE recursivo se a nova conexão criaria um ciclo
antes de qualquer INSERT.

```sql
CREATE TABLE demanda_conexao (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  demanda_origem_id   INTEGER NOT NULL REFERENCES demanda(id),
  demanda_destino_id  INTEGER NOT NULL REFERENCES demanda(id),
  bidirecional     BOOLEAN NOT NULL,

  CONSTRAINT chk_demanda_conexao_sem_autorreferencia
    CHECK (demanda_origem_id != demanda_destino_id)
);

CREATE UNIQUE INDEX uix_demanda_conexao_ativa
  ON demanda_conexao(demanda_origem_id, demanda_destino_id)
  WHERE is_deleted = false;

CREATE INDEX ix_demanda_conexao_origem
  ON demanda_conexao(demanda_origem_id)
  WHERE is_deleted = false;

CREATE INDEX ix_demanda_conexao_destino
  ON demanda_conexao(demanda_destino_id)
  WHERE is_deleted = false;
```

---

### demanda_tag

Junction: tags atribuídas a demandas. Apenas gestores atribuem.

```sql
CREATE TABLE demanda_tag (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  demanda_id  INTEGER NOT NULL REFERENCES demanda(id),
  tag_id      INTEGER NOT NULL REFERENCES tag(id)
);

CREATE UNIQUE INDEX uix_demanda_tag_ativa
  ON demanda_tag(demanda_id, tag_id)
  WHERE is_deleted = false;
```

---

### atividade

Atividades pertencem a demandas e são executadas por um usuário principal.
Múltiplos usuários podem registrar execuções na mesma atividade — cada um
com suas próprias execuções independentes.

```sql
CREATE TABLE atividade (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  demanda_id      INTEGER      NOT NULL REFERENCES demanda(id),
  usuario_id      INTEGER      NOT NULL REFERENCES usuario(id),
  nome            VARCHAR(255) NOT NULL,
  tipo_atividade_status_id INTEGER NOT NULL
                    CONSTRAINT fk_atividade_tipo_atividade_status REFERENCES tipo_atividade_status(id),
  tipo_atividade_prioridade_id INTEGER NOT NULL      -- migration 0036; as atividades antigas ficaram INDEFINIDA
                    CONSTRAINT fk_atividade_tipo_atividade_prioridade REFERENCES tipo_atividade_prioridade(id)
);

CREATE INDEX ix_atividade_demanda
  ON atividade(demanda_id)
  WHERE is_deleted = false;

CREATE INDEX ix_atividade_usuario
  ON atividade(usuario_id)
  WHERE is_deleted = false;

CREATE INDEX ix_atividade_tipo_atividade_status_id
  ON atividade(tipo_atividade_status_id)
  WHERE is_deleted = false;
```

---

### atividade_tag

Junction: tags atribuídas a atividades. Apenas gestores atribuem.

```sql
CREATE TABLE atividade_tag (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  atividade_id  INTEGER NOT NULL REFERENCES atividade(id),
  tag_id        INTEGER NOT NULL REFERENCES tag(id)
);

CREATE UNIQUE INDEX uix_atividade_tag_ativa
  ON atividade_tag(atividade_id, tag_id)
  WHERE is_deleted = false;
```

---

### execucao

Registros de tempo de trabalho. Um usuário inicia uma execução
(`fim_data = NULL`) e a encerra preenchendo `fim_data`.

Regra: um usuário não pode ter duas execuções ativas simultaneamente.
Validada na service antes do INSERT.

Intervalos do dia são calculados em tempo de consulta a partir dos gaps
entre execuções — não são armazenados. O módulo `ponto` ignora gaps
menores que `INTERVALO_MINIMO_MINUTOS` (configurado via env).

Execuções em finais de semana são permitidas mas tratadas como horas extras
pelo módulo `ponto`.

```sql
CREATE TABLE execucao (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  atividade_id  INTEGER   NOT NULL REFERENCES atividade(id),
  descricao     TEXT      NOT NULL,
  inicio_data   TIMESTAMP NOT NULL,
  fim_data      TIMESTAMP,

  CONSTRAINT chk_execucao_periodo_valido
    CHECK (fim_data IS NULL OR fim_data > inicio_data)
);

CREATE INDEX ix_execucao_atividade
  ON execucao(atividade_id)
  WHERE is_deleted = false;

CREATE INDEX ix_execucao_inicio_data
  ON execucao(inicio_data)
  WHERE is_deleted = false;

CREATE INDEX ix_execucao_ativa
  ON execucao(atividade_id)
  WHERE is_deleted = false AND fim_data IS NULL;
```

---

### dia_nao_util

Dias que não contam como dias úteis trabalhados.
Finais de semana são tratados automaticamente pela aplicação — não precisam ser cadastrados.

`recorrente = true`: o dia se repete todo ano na mesma data (dia + mês).
A aplicação verifica mês e dia independentemente do ano ao calcular o ponto.

`duracao` (`INTEGRAL` / `MEIO_PERIODO`, migration `20240014`) é independente do `tipo`:
`MEIO_PERIODO` reduz a meta diária à metade no módulo `ponto` (sem distinção de turno).

> **Enums como FK (migration `20240025`):** `tipo` e `duracao` deixaram de ser `VARCHAR + CHECK`
> e passaram a ser FK (`tipo_dia_nao_util_id`, `tipo_dia_nao_util_duracao_id`) para as tabelas de
> referência. A antiga `chk_dia_nao_util_duracao` foi removida junto com a coluna `VARCHAR`.

```sql
CREATE TABLE dia_nao_util (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  dia_data    DATE         NOT NULL,
  descricao   VARCHAR(255) NOT NULL,
  tipo_dia_nao_util_id         INTEGER NOT NULL
                CONSTRAINT fk_dia_nao_util_tipo_dia_nao_util REFERENCES tipo_dia_nao_util(id),
  tipo_dia_nao_util_duracao_id INTEGER NOT NULL
                CONSTRAINT fk_dia_nao_util_tipo_dia_nao_util_duracao REFERENCES tipo_dia_nao_util_duracao(id),
  recorrente  BOOLEAN      NOT NULL
);

CREATE INDEX ix_dia_nao_util_dia_data
  ON dia_nao_util(dia_data)
  WHERE is_deleted = false;
```

---

### anotacao — pad do usuário em cinco seções (migration `0030`)

Uma linha por usuário e por seção (`tipo_anotacao`: `EM_ANDAMENTO`, `FEITO`, `PENDENCIA`, `LEMBRETE`, `PESSOAL`).
Quem já existia ganhou as 5 linhas (vazias) na migration; usuário novo as recebe na mesma transação em que é criado.
A migration `0031` copiou `usuario.anotacoes` (Markdown) para a seção `PESSOAL` de quem tinha texto (só onde a seção estava vazia) e a `0032`
removeu `usuario.anotacoes` e `usuario.anotacoes_alteracao_data` (ela confere a cópia antes e para com erro se algum texto ficaria sem destino).
O texto é Markdown e seção vazia é `''`. `tipo_anotacao` tem a coluna extra `ordem` (ordem de exibição).

```sql
CREATE TABLE anotacao (
  id                SERIAL      PRIMARY KEY,
  created_date      TIMESTAMPTZ NOT NULL,
  updated_date      TIMESTAMPTZ NOT NULL,   -- também é a "versão" da seção (concorrência otimista)
  is_deleted        BOOLEAN     NOT NULL,
  deleted_date      TIMESTAMPTZ,

  usuario_id        INTEGER NOT NULL CONSTRAINT fk_anotacao_usuario REFERENCES usuario(id),
  tipo_anotacao_id  INTEGER NOT NULL CONSTRAINT fk_anotacao_tipo_anotacao REFERENCES tipo_anotacao(id),
  texto             TEXT    NOT NULL
);

CREATE UNIQUE INDEX uix_anotacao_usuario_tipo_ativa
  ON anotacao(usuario_id, tipo_anotacao_id)
  WHERE is_deleted = false;
```

---

### configuracao_ia — configuração da IA, uma linha por versão (migration `0033`)

A versão ativa é a de maior `versao`; versão antiga nunca é alterada (editar é gravar a seguinte). A chave de API do provedor **não** fica no banco
(`.env`). A versão 1 vem por seed (Anthropic, IA **desligada**, check-in entre 30 e 80 minutos, duração recomendada de 90). A migration `0044` acrescentou `duvidas_codigo` e `modo_contexto_chat` (as versões que já existiam ficaram `false` e `MISTURADO`). A `0049` (task 203) moveu os três modelos para `modelos_provedor` (o trio de cada versão foi para a chave do provedor dela) e criou `fallbacks` (`[]` nas versões antigas); o provedor padrão continua em `tipo_provedor_ia_id`. A `0055` (task 228) acrescentou `niveis_proposta` (anulável: as versões que já existiam ficaram sem o mapa e valem o padrão do `shared`). A `0079` (spec 261) trocou tudo isso por **uma cadeia por nível**: `cadeia_rapido`, `cadeia_padrao` e `cadeia_analitico`, cada uma um array JSONB de itens `{ provedor, modelo, esforco }` na ordem em que são tentados (o primeiro é o principal do nível, os seguintes a contingência; tamanho livre, mínimo 1). Saíram `tipo_provedor_ia_id` (e a FK), `modelos_provedor`, `fallbacks` e `esforco_analitico`; a tabela `tipo_provedor_ia` e o seu seed **permanecem** (a configuração não a lê mais; removê-la é pendência registrada). Cada versão histórica foi convertida em três cadeias iguais, copiando a que tinha (provedor padrão e depois os fallbacks, com o modelo de cada nível); o esforço do analítico é o `esforco_analitico` que a versão tinha e rápido e padrão ganharam `MEDIO` explícito (antes dependiam do padrão do SDK). Modelos de provedores fora da cadeia da versão se perderam. O **`DOWN` perde informação** e está testado: o provedor padrão e os fallbacks saem da cadeia do padrão, o esforço do analítico do primeiro item da cadeia do analítico e os modelos de cada provedor dos itens das três cadeias (nível sem item do provedor usa o do padrão, depois o do rápido, depois o do analítico); as diferenças entre as cadeias dos níveis se perdem, então antes de qualquer rollback em produção mostre ao autor o que seria perdido. A conversão grava `updated_date = NOW()` nas linhas vivas e deixa o das excluídas como estava (excluído é morto; o trigger legado fica desligado só durante o `UPDATE`). A coerência (ao menos um item, sem provedor repetido na mesma cadeia, modelo do provedor pelo prefixo do nome, esforço válido) é da **service** e do `shared` (`validarCadeiasDaConfiguracaoIa`), não do banco: o provedor e o esforço dentro dos itens são texto validado, sem tabela de referência.

```sql
CREATE TABLE configuracao_ia (
  id                           SERIAL      PRIMARY KEY,
  created_date                 TIMESTAMPTZ NOT NULL,
  updated_date                 TIMESTAMPTZ NOT NULL,
  is_deleted                   BOOLEAN     NOT NULL,
  deleted_date                 TIMESTAMPTZ,

  versao                       INTEGER      NOT NULL,
  cadeia_rapido                JSONB        NOT NULL,   -- migration 0079: array de { provedor, modelo, esforco } do nível RAPIDO, na ordem de tentativa (provedor = TipoProvedorIaEnum, esforco = EsforcoIaEnum BAIXO/MEDIO/ALTO; sem tabela nem CHECK nos itens)
  cadeia_padrao                JSONB        NOT NULL,   -- migration 0079: o mesmo para o nível PADRAO
  cadeia_analitico             JSONB        NOT NULL,   -- migration 0079: o mesmo para o nível ANALITICO
  checkin_minimo_minutos       INTEGER      NOT NULL,
  checkin_maximo_minutos       INTEGER      NOT NULL,
  duracao_recomendada_minutos  INTEGER      NOT NULL,
  checkin_inteligente          BOOLEAN      NOT NULL,
  rigor_proporcional           BOOLEAN      NOT NULL,
  deteccao_automatica          BOOLEAN      NOT NULL,
  duvidas_codigo               BOOLEAN      NOT NULL,   -- migration 0044: o chat também responde dúvidas de programação (false: só o Project)
  modo_contexto_chat           VARCHAR(20)  NOT NULL,   -- migration 0044: MISTURADO/SEPARADO (ModoContextoChatEnum do shared; sem tabela nem CHECK)
  ia_desligada                 BOOLEAN      NOT NULL,
  niveis_proposta              JSONB,                   -- migration 0055: regra de proposta → FAZ_E_AVISA/PERGUNTA (autonomia da IA); nulo = padrão do shared; a nova versão sem o campo copia o da anterior
  precos_modelo                JSONB        NOT NULL,   -- migration 0048: modelo → { precoEntradaMilhao, precoSaidaMilhao, precoCacheMilhao } em dólar por milhão de tokens; a nova versão copia os da anterior e editar um preço na aba Custos altera a versão ativa no lugar
  usuario_id                   INTEGER      NOT NULL CONSTRAINT fk_configuracao_ia_usuario REFERENCES usuario(id),  -- quem salvou

  CONSTRAINT chk_configuracao_ia_intervalo_checkin CHECK (checkin_minimo_minutos < checkin_maximo_minutos),
  CONSTRAINT chk_configuracao_ia_cadeia_rapido CHECK (jsonb_typeof(cadeia_rapido) = 'array' AND jsonb_array_length(cadeia_rapido) >= 1),
  CONSTRAINT chk_configuracao_ia_cadeia_padrao CHECK (jsonb_typeof(cadeia_padrao) = 'array' AND jsonb_array_length(cadeia_padrao) >= 1),
  CONSTRAINT chk_configuracao_ia_cadeia_analitico CHECK (jsonb_typeof(cadeia_analitico) = 'array' AND jsonb_array_length(cadeia_analitico) >= 1),
  CONSTRAINT chk_configuracao_ia_niveis_proposta CHECK (niveis_proposta IS NULL OR jsonb_typeof(niveis_proposta) = 'object')
);

CREATE UNIQUE INDEX uix_configuracao_ia_versao ON configuracao_ia(versao) WHERE is_deleted = false;
```

---

### prompt — prompts da IA versionados (migration `0034`)

Uma linha por versão de cada tipo. A versão é **rascunho** (`rascunho = true`), **ativa** (`ativo = true`) ou **antiga** (as duas falsas: o histórico). O texto de uma
versão publicada nunca é reescrito: editar é salvar o rascunho, ativar é trocar quem é a ativa. Uma só ativa e um só rascunho por tipo é regra da **service**, dentro de
transação que trava a linha do tipo (sem índice único, por decisão do autor). A versão 1 de cada tipo vem por seed e é o "padrão".

```sql
CREATE TABLE prompt (
  id              SERIAL      PRIMARY KEY,
  created_date    TIMESTAMPTZ NOT NULL,
  updated_date    TIMESTAMPTZ NOT NULL,
  is_deleted      BOOLEAN     NOT NULL,
  deleted_date    TIMESTAMPTZ,

  tipo_prompt_id  INTEGER NOT NULL CONSTRAINT fk_prompt_tipo_prompt REFERENCES tipo_prompt(id),
  versao          INTEGER NOT NULL,
  conteudo        TEXT    NOT NULL,   -- Markdown
  ativo           BOOLEAN NOT NULL,
  rascunho        BOOLEAN NOT NULL,
  usuario_id      INTEGER NOT NULL CONSTRAINT fk_prompt_usuario REFERENCES usuario(id)   -- autor da versão
);

CREATE UNIQUE INDEX uix_prompt_tipo_versao ON prompt(tipo_prompt_id, versao) WHERE is_deleted = false;
```

---

### proposta_ia — ações que a IA propôs ao usuário (migration `0035`)

Uma linha por proposta. A IA só **propõe**; a ação roda quando o usuário confirma (uma vez), pela service do domínio. A troca de situação é um `UPDATE` condicional
(só `PENDENTE` passa), o que impede duas confirmações simultâneas de executar duas vezes. `resultado` guarda o que a ação criou ou alterou (base do "desfazer").
Só dois tipos tiram algo do ar, por exceção nomeada (task 230): `DESCONECTAR_DEMANDA` e `EXCLUIR_ATIVIDADE` (sem execução), ambos por soft delete e desfazíveis; a IA não exclui mais nada. A exceção à "confirmação do usuário" é a autonomia da IA (task 228): no nível "Faz e avisa" a própria IA confirma a proposta na hora e ela fica marcada em `aplicada_pela_ia`.

```sql
CREATE TABLE proposta_ia (
  id                          SERIAL      PRIMARY KEY,
  created_date                TIMESTAMPTZ NOT NULL,
  updated_date                TIMESTAMPTZ NOT NULL,
  is_deleted                  BOOLEAN     NOT NULL,
  deleted_date                TIMESTAMPTZ,

  usuario_id                  INTEGER NOT NULL CONSTRAINT fk_proposta_ia_usuario REFERENCES usuario(id),
  tipo_proposta_ia_id         INTEGER NOT NULL CONSTRAINT fk_proposta_ia_tipo_proposta_ia REFERENCES tipo_proposta_ia(id),
  tipo_proposta_ia_status_id  INTEGER NOT NULL CONSTRAINT fk_proposta_ia_tipo_proposta_ia_status REFERENCES tipo_proposta_ia_status(id),
  dados                       JSONB   NOT NULL,   -- argumentos da ação, validados pelo executor do tipo
  resolucao_data              TIMESTAMPTZ,
  resultado                   JSONB,              -- ids do que foi criado ou alterado
  aplicada_pela_ia            BOOLEAN NOT NULL    -- migration 0055: a IA executou sozinha (nível "Faz e avisa"); as anteriores foram todas do usuário (false)
);

CREATE INDEX ix_proposta_ia_usuario ON proposta_ia(usuario_id) WHERE is_deleted = false;
```

---

### Modelagem — grupos e posições do diagrama (migrations `0052` e `0053`)

Alimentam a tela Modelagem (`GET /modelagem`). O catálogo do PostgreSQL diz quais tabelas e colunas existem (o visual); estas duas tabelas guardam a **organização**, que é do gestor e vale mais que o banco: os grupos (caixas coloridas) e quais tabelas estão na modelagem, em que grupo e em que posição. Uma tabela está **na modelagem** quando tem linha ativa em `modelagem_tabela`; tirá-la da modelagem é só excluir (soft delete) essa linha, a tabela do banco nunca é tocada. Tabela do banco sem linha (nova, ou tirada) aparece no canto de baixo do desenho, em "Fora da modelagem".

```sql
CREATE TABLE modelagem_grupo (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  titulo     VARCHAR(150) NOT NULL,   -- texto da caixa no diagrama
  rotulo     VARCHAR(60)  NOT NULL,   -- nome curto do botão de filtro; único entre os ativos, sem diferenciar maiúsculas
  ordem      INTEGER      NOT NULL,
  cor_indice INTEGER      NOT NULL,   -- 0 a 6 na paleta do diagrama (o 7 é do "Sem grupo", que não é linha)

  CONSTRAINT chk_modelagem_grupo_cor_indice CHECK (cor_indice BETWEEN 0 AND 6)
);
CREATE UNIQUE INDEX uix_modelagem_grupo_rotulo_ativo ON modelagem_grupo (LOWER(rotulo)) WHERE is_deleted = false;

CREATE TABLE modelagem_tabela (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  nome_tabela        VARCHAR(100) NOT NULL,   -- nome no catálogo do banco (não é FK: a tabela nasce e some por migration)
  modelagem_grupo_id INTEGER      NOT NULL,   -- toda tabela na modelagem tem grupo (NOT NULL desde a 0053; a 0052 permitia nulo)
  posicao_x          INTEGER      NOT NULL,
  posicao_y          INTEGER      NOT NULL,

  CONSTRAINT fk_modelagem_tabela_modelagem_grupo FOREIGN KEY (modelagem_grupo_id) REFERENCES modelagem_grupo(id)
);
CREATE UNIQUE INDEX uix_modelagem_tabela_nome_tabela_ativa ON modelagem_tabela (nome_tabela) WHERE is_deleted = false;
CREATE INDEX ix_modelagem_tabela_modelagem_grupo ON modelagem_tabela (modelagem_grupo_id);
```

A `0052` semeia os 6 grupos (Domínio, Usuários e ponto, Calendário, IA, Chat, Modelagem) e as 37 posições que a tela tinha; a `0053` tira da modelagem (soft delete) as linhas sem grupo e passa a coluna a `NOT NULL`. Tabela sem linha ativa não herda grupo de ninguém (nem a `tipo_*`) e não tem posição guardada. Excluir um grupo só é permitido vazio (a service confere pelo diagrama resolvido).

### Plano do chat com a IA — migration `0059` (task 232)

> O **plano** é o documento do modo planejamento: três textos Markdown (rascunho das descrições técnica e do cliente e da documentação de uma demanda) que vive vários dias e só grava na demanda ao publicar (task 237). Guarda-chuva `chat-planejamento.spec.md`; modelagem em `chat-planejamento/modelagem.md`. As tabelas de pontos em aberto e de fontes (`plano_ponto`, `plano_fonte`) entram nas tasks 235 e 236. Colunas de `BaseEntity`, nenhum `DEFAULT`.

#### `plano`
`titulo` (`VARCHAR(255)`), `projeto_id` (FK, **anulável**: plano amplo, pessoal do criador), `usuario_id` (FK: quem criou), `solo`, `arquivado`, `descricao_tecnica`, `descricao_cliente` e `documentacao` (`TEXT`, anuláveis: o rascunho) e `versao` (`INTEGER`, a partir de 1; sobe a cada gravação do documento e é a base da recusa de gravação sobre versão mais nova: o `UPDATE` compara e grava na mesma instrução). Índices parciais em `projeto_id` e `usuario_id`.
Quem vê: plano amplo e plano solo, só o criador; plano de projeto, quem tem acesso ao projeto (regra pura `podeAcessarPlano`, no `shared`). A leitura esconde o plano de projeto excluído; restaurar o projeto o traz de volta.

#### `plano_demanda`
Ligação do plano com a demanda para a qual ele publica: `plano_id` e `demanda_id` (FKs) e `publicacao_data` (`TIMESTAMPTZ`, anulável: ligado e ainda não publicado). Índice único parcial em (`plano_id`, `demanda_id`) com `is_deleted = false`. A service admite **uma** linha ativa por plano (a tabela já admite várias, para o projeto futuro "plano que vira várias demandas"). Demanda excluída deixa o plano sem demanda (a leitura só junta demanda ativa).

#### `plano_ponto` — pontos em aberto do plano (migration `0061`, task 235)
`plano_id` (FK), `rotulo` (`VARCHAR(60)`, **texto livre** escolhido pela IA ou pela pessoa: nada valida contra lista), `texto`, `tipo_plano_ponto_situacao_id` (FK para a tabela de referência `tipo_plano_ponto_situacao`: `ABERTO`, `RESOLVIDO`, `DISPENSADO`, `DECISAO`) e `resolucao_texto` (anulável: a resposta, o motivo de dispensar ou a decisão). Índice parcial em `plano_id`. Reabrir volta a `ABERTO` e apaga a resolução.

#### `plano_fonte` — material de fora do plano (migration `0062`, task 236)
`plano_id` (FK), `titulo` (`VARCHAR(120)`: dado pela pessoa ou o nome do arquivo), `conteudo` (`TEXT`: **só o texto**; o arquivo `.txt`/`.md` é lido na tela e não é guardado como binário), `tipo_plano_fonte_origem_id` (FK para a tabela de referência `tipo_plano_fonte_origem`: `COLADO`, `ARQUIVO`) e `usuario_id` (FK: quem trouxe). Índice parcial em `plano_id`. Excluir é soft delete e a fonte some do contexto da IA. Limites (`shared`): 4000 caracteres no conteúdo, 120 no título, 10 fontes por plano.

### Tabelas de referência (enums) — migration `20240025`

Todo enum de domínio fechado é uma **tabela de referência** `tipo_<tabela>_<complemento?>`
(`SYSTEM.SPEC.md` §5.4, §9.2 #13, §16 #26) — **nunca** `VARCHAR + CHECK` nem `ENUM` nativo. Cada
tabela segue a BaseEntity + `codigo` (valor SCREAMING_SNAKE, espelha o enum TS de `shared/`) +
`descricao` (rótulo legível). A coluna de negócio é um `INTEGER` FK para o `id` dela; o
repositório traduz `codigo ⇄ id` no SQL (subselect no INSERT/UPDATE, JOIN expondo
`codigo AS <campo>` no SELECT/RETURNING). As 6 tabelas:
`tipo_usuario`, `tipo_projeto_status`, `tipo_demanda_status`,
`tipo_atividade_status`, `tipo_dia_nao_util`, `tipo_dia_nao_util_duracao`.

```sql
-- Molde comum (uma CREATE por tabela acima):
CREATE TABLE tipo_usuario (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);

CREATE UNIQUE INDEX uix_tipo_usuario_codigo
  ON tipo_usuario(codigo)
  WHERE is_deleted = false;
```

Em `tipo_usuario`, a `descricao` guarda o **texto de ajuda do tipo** (migration `0078`, task 308): `VARCHAR(2000)` em Markdown, com linhas `✓ ...` (pode) e
`✕ ...` (não pode), semeada com `DESCRICAO_TIPO_USUARIO` (`shared`) e editada só pelo administrador (`PUT /tipo-usuario-ajuda/:tipo`). O nome de exibição
("Gestor", "Auxiliar"…) **não** vive no banco: é `rotuloTipoUsuario`, no frontend. As outras tabelas `tipo_*` seguem com `descricao VARCHAR(100)`.

Seeds (`codigo` → `descricao`):

| Tabela | Seeds |
|---|---|
| `tipo_usuario` | DESENVOLVEDOR, GESTOR, ADMINISTRADOR (migration `0029`) e AUXILIAR (migration `0074`); a `descricao` é o texto de ajuda (migration `0078`), não o nome |
| `tipo_projeto_status` | ATIVO→"Ativo", PAUSADO→"Pausado", CONCLUIDO→"Concluído", CANCELADO→"Cancelado" |
| `tipo_demanda_status` | PENDENTE→"Pendente", PLANEJADA→"Planejada", CONCLUIDA→"Concluída" |
| `tipo_atividade_status` | PLANEJADA→"Planejada", PENDENTE→"Pendente", DESENVOLVENDO→"Desenvolvendo", DESENVOLVIDA→"Desenvolvida" |
| `tipo_dia_nao_util` | FERIADO→"Feriado", RECESSO→"Recesso", PONTO_FACULTATIVO→"Ponto facultativo" |
| `tipo_dia_nao_util_duracao` | INTEGRAL→"Integral", MEIO_PERIODO→"Meio período" |
| `tipo_atividade_prioridade` | URGENTE (1, `#dc2626`), ALTA (2, `#f97316`), MEDIA (3, `#eab308`), BAIXA (4, `#0ea5e9`), INDEFINIDA (5, `#94a3b8`), com `ordem` INTEGER (única entre as ativas) e `cor` VARCHAR(7) além do molde; só a `cor` é editável, só pelo administrador (migration `0036`) |
| `tipo_proposta_ia` | INICIAR_EXECUCAO, PAUSAR_EXECUCAO, CRIAR_ATIVIDADE, DESCREVER_EXECUCAO, SUSPENDER_CHECKIN, ANOTAR_PAD, CRIAR_DEMANDA, DESCREVER_DEMANDA, CONECTAR_DEMANDA (migration `0035`; `CRIAR_PROJETO` na `0037`; `ALTERAR_ATIVIDADE` na `0039`; `REGISTRAR_EXECUCAO` e `CORRIGIR_EXECUCAO` na `0040`; `ALTERAR_DEMANDA` na `0041`; `ATRIBUIR_MEMBRO` e `ATRIBUIR_TAG` na `0042`; `CONCLUIR_DEMANDA` e `MOVER_ATIVIDADE` na `0056`; `DESCONECTAR_DEMANDA` e `EXCLUIR_ATIVIDADE` na `0057`, as duas únicas exclusões da IA, por exceção nomeada; `JUSTIFICAR_PONTO` na `0058`; `ALTERAR_TRECHO_PLANO` na `0060`) |
| `tipo_proposta_ia_status` | PENDENTE, CONFIRMADA, AJUSTADA, EXPIRADA (também a recusada), DESFEITA (migration `0035`) |
| `tipo_prompt` | CONVERSA, CHECKIN, DESCRICAO_EXECUCAO, PAD, PRIORIDADE, ENTREVISTA_DEMANDA, CONEXAO_DEMANDA (migration `0034`), DUVIDA_CODIGO (migration `0044`, com a versão 1 semeada; a lista cresce por migration) ; PLANEJAMENTO, PLANO_DESCRICAO_TECNICA, PLANO_DESCRICAO_CLIENTE e PLANO_DOCUMENTACAO na `0060`, com a versão 1 semeada) |
| `tipo_provedor_ia` | ANTHROPIC→"Anthropic", GOOGLE→"Google", OPENAI→"OpenAI" (migration `0033`; os três têm implementação desde a task 203) |
| `tipo_anotacao` | EM_ANDAMENTO→"Em andamento", FEITO→"Feito", PENDENCIA→"Pendências", LEMBRETE→"Lembretes", PESSOAL→"Pessoal" (migration `0030`, com `ordem` 1 a 5) |

### Chat entre colaboradores — migration `0050` (task 205)

> As **mensagens não ficam no PostgreSQL**: são gravadas uma vez e, no chat entre colaboradores, só o autor reescreve o texto da própria mensagem, até 1 hora depois do envio (task 313; o chat da IA nunca reescreve), num índice (OpenSearch no desenvolvimento, Elasticsearch na produção final) ou,
> na produção de teste, numa tabela provisória (task 207). Estas três tabelas guardam o **estado que muda**. Modelagem completa em
> `docs/specs/backlog/chat-colaboradores/modelagem.md` (anexo da guarda-chuva `chat-colaboradores.spec.md`; os dois vão para `done/` com a última task, a 215).
>
> `conversa_id` é `<menorUsuarioId>-<maiorUsuarioId>` (ex.: `4-9`): o par sempre cai na mesma conversa e por isso não existe tabela de conversa. Um `CHECK` em cada tabela
> garante que o texto bate com os dois ids da própria linha. Todas têm os campos de `BaseEntity` e nenhum `DEFAULT`.

#### `mensagem_direta_leitura`
Até onde cada pessoa leu cada conversa e se silenciou os avisos dela. Uma linha por pessoa e conversa, criada na primeira leitura ou no primeiro silêncio. Colunas de `BaseEntity` mais:
`conversa_id` (`VARCHAR(21)`), `usuario_id` e `outro_usuario_id` (FKs para `usuario`, diferentes entre si), `lida_ate_date` (anulável) e `silenciada`.
`lida_ate_date` é o `created_date` da **última mensagem que a pessoa viu**, não o instante da leitura: uma mensagem que chega entre a busca e a marcação nunca é dada como lida sem
ter sido vista. As **não lidas** são as mensagens do outro mais novas que esse ponto; o **"Lida"** de uma mensagem minha vale quando a linha do outro tem `lida_ate_date` maior ou
igual à data dela. Índice único parcial em (`conversa_id`, `usuario_id`) e índice em `usuario_id`.

#### `mensagem_direta_preferencia`
As preferências do chat, uma linha por usuário, criada na primeira alteração: `usuario_id` (FK, único entre as linhas ativas), `avisos_ativos`, `aviso_desktop_ativo`, `som_ativo`,
`silenciado_ate_date` (anulável), `atalho_global` (`VARCHAR(40)`, formato do Electron) e, desde a task 221 (migration `0064`), `posicao_popup` (`VARCHAR(30)` anulável: o código de `PosicaoPopupChatEnum`, sem tabela de referência porque não
entra em `WHERE`/`JOIN`/FK; sem valor vale `CANTO_INFERIOR_DIREITO`, o padrão do `shared`) e, desde a task 318 (migration `0081`), `posicao_barra` (`VARCHAR(30)` anulável: o código de `PosicaoBarraChatEnum`, onde fica a barra de conversas da conversa aberta; sem valor vale `ESQUERDA`). Sem linha, a service devolve `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`, do `shared`
(nunca um `DEFAULT`). "Silenciar por 1 hora" grava o instante final em `silenciado_ate_date`; quem decide se um aviso aparece é a service, comparando com a hora atual, então não
há tarefa agendada para reativar.

#### `mensagem_direta_supervisao`
Auditoria: cada abertura, por gestor ou administrador, de uma conversa que não é dele. Só conversas entre desenvolvedores podem ser abertas (a service confere pelo tipo atual dos
dois usuários). Colunas de `BaseEntity` mais: `leitor_usuario_id`, `conversa_id`, `usuario_menor_id`, `usuario_maior_id` (FKs para `usuario`; `usuario_menor_id < usuario_maior_id`) e
`participantes_avisados` (esta abertura gerou o aviso na conversa; o aviso sai uma vez por leitor, conversa e dia). `created_date` é o instante da abertura. Índice em
(`leitor_usuario_id`, `conversa_id`, `created_date`).

#### `mensagem_direta_reacao` (task 314)
As reações às mensagens do chat entre colaboradores, uma por pessoa por mensagem. Fica no PostgreSQL **para as três implementações do armazenamento** (a mensagem pode viver no índice), e a service junta as reações à página de mensagens. Colunas de `BaseEntity` mais: `mensagem_id` (`UUID`, **sem FK**: a mensagem pode estar fora do PostgreSQL), `conversa_id` (`VARCHAR(21)`, `<menorId>-<maiorId>`, com `CHECK` do formato), `usuario_id` (FK para `usuario`, quem reagiu) e `reacao` (`VARCHAR(32)`: o **próprio emoji**, um só, conferido pela regra `ehReacaoValida` do `shared`). Índice único parcial em (`mensagem_id`, `usuario_id`) onde `is_deleted = false` e índice em `conversa_id`. Trocar a reação é `UPDATE`; tirar é soft delete, e reagir de novo depois cria uma linha nova.

#### Grupos do chat (task 246, migration `0087`)
O grupo é uma entidade com tabela própria; a conversa um a um não muda. As mensagens do grupo ficam no mesmo armazenamento das um a um (índice ou `mensagem_direta`), com `conversa_tipo = GRUPO` e `conversa_id = G<id do grupo>`. Todas as tabelas têm as colunas de `BaseEntity` e nenhum `DEFAULT`.

- **`tipo_grupo`**: tabela de referência (`codigo`, `descricao`) com `LIVRE`, `PROJETO` e `DEMANDA` (`TipoGrupoEnum`). `PROJETO` e `DEMANDA` são os canais da task 248.
- **`grupo`**: `nome` (`VARCHAR(60)`), `tipo_grupo_id` (FK), `criador_usuario_id` (FK para `usuario`), `projeto_id` e `demanda_id` (FKs anuláveis, só nos canais; índices únicos parciais: um canal por demanda e um por projeto), `cor_avatar` (`VARCHAR(7)`, `#RRGGBB`, anulável) e `emoji_avatar` (`VARCHAR(16)`, anulável). Sem cor vale o degradê das cores dos membros atuais e sem emoji valem as iniciais do nome; o padrão mora no frontend.
- **`grupo_membro`**: só do grupo livre. `grupo_id`, `usuario_id` (FKs), `entrada_data` e `saida_data` (anulável; `CHECK` de saída >= entrada). Sair preenche `saida_data`; ser readicionado reabre a mesma linha (`saida_data` nula, `entrada_data` nova). Único em (`grupo_id`, `usuario_id`) entre as linhas ativas; `entrada_data` é o ponto de partida das não lidas.
- **`grupo_leitura`**: `grupo_id`, `usuario_id` (FKs), `lida_ate_data` (o `created_date` da última mensagem vista; anulável) e `silenciada`. Único em (`grupo_id`, `usuario_id`) entre as ativas.

A `0087` também altera duas tabelas existentes. `mensagem_direta` (provisória): `usuario_menor_id` e `usuario_maior_id` passam a aceitar nulo (nulos no grupo), ganha `conversa_tipo` (`VARCHAR(10)`: `DIRETA` ou `GRUPO`) e `grupo_id` (`INTEGER` anulável, sem FK como o resto da tabela); os dois `CHECK` antigos viram um só, `chk_mensagem_direta_conversa`, que amarra o `conversa_id` ao par (um a um) ou a `G<grupo_id>` (grupo). `mensagem_direta_supervisao`: ganha `grupo_id` (FK anulável) e os participantes passam a aceitar nulo, com o mesmo `CHECK` (`chk_mensagem_direta_supervisao_conversa`); a abertura de um grupo guarda `grupo_id` e deixa o par nulo.

### Tabelas provisórias — migrations `0038` (task 162) e `0051` (task 207)

> **Não fazem parte do modelo definitivo.** Existem só para o ambiente de teste (`CHAT_ARMAZENAMENTO=postgres`) guardar as mensagens do
> chat com a IA (`0038`) e as do chat entre colaboradores (`0051`) sem um serviço de busca. Na produção de verdade o histórico fica no Elasticsearch. **Remoção:** uma migration nova
> derruba, **nesta ordem**, `mensagem_direta`, `chat_conversa`, `chat_mensagem` e só então as funções `fn_chat_texto_busca` e `fn_chat_texto_consulta` (o índice de busca das duas
> tabelas de mensagem depende delas); junto saem `ChatMensagemPostgresRepository` e `MensagemDiretaPostgresRepository` e o ramo `postgres` dos dois providers
> (`armazenamento-de-chat.ts` e `armazenamento-de-mensagem-direta.ts`). As tabelas trazem `COMMENT ON TABLE` com o aviso.

#### `chat_mensagem`
Uma linha por mensagem do chat, gravada uma vez e nunca reescrita (sem exclusão nem alteração pela aplicação). Colunas de `BaseEntity` mais:
`mensagem_id` (UUID, único), `conversa_id` (`<usuarioId>-<yyyy-mm-dd>`), `usuario_id`, `contexto` (`CHAT`/`CHECKIN`), `autor` (`USUARIO`/`IA`/`SISTEMA`), `assunto` (`SISTEMA`/`CODIGO`, anulável: mensagem antiga, do sistema ou do check-in fica sem marca e é lida como `SISTEMA`; migration `0045`), `texto`, `nivel`, `modelo`, `modelo_planejado` (anulável, `VARCHAR(100)`; migration `0080`, spec 261: o modelo do item principal da cadeia do nível na chamada que gerou a resposta, a mesma de `modelo`; difere de `modelo` só quando um item de contingência respondeu, e a tela então mostra "Fallback utilizado"; a mensagem antiga e a que não é da IA ficam nulas, e no Elasticsearch o campo é `modelo_planejado`, `keyword`), `tokens_entrada`, `tokens_saida`, `tokens_cache`, `proposta_id` (a primeira proposta do turno), `propostas_ids` (`INTEGER[]` anulável com todas, na ordem; migration `0054`, task 225: a linha antiga sem ela é lida como `[proposta_id]`), `execucao_id`, `atividade_id`, `demanda_id` (referências opcionais, sem FK) e `conteudo_bruto` (JSONB). `created_date` é a data da mensagem. Índices: (`usuario_id`, `conversa_id`, `created_date`) e GIN em `fn_chat_texto_busca(texto)`, que é `to_tsvector('portuguese', unaccent(texto))` (busca sem acento; exige a extensão `unaccent`). `fn_chat_texto_consulta(texto)` normaliza o texto digitado do mesmo jeito (`plainto_tsquery`). As duas fixam `search_path = public, extensions, pg_catalog`: no Supabase as extensões vivem no schema `extensions`, que a conexão da aplicação não enxerga por padrão, e o SQL da aplicação nunca chama `unaccent` diretamente.

#### `mensagem_direta` (task 207)
Uma linha por mensagem entre colaboradores, com os mesmos campos e nomes do documento do índice `mensagem-direta`; gravada uma vez, e só o autor reescreve o `texto` (task 313, até 1 hora depois de `created_date`). Colunas de `BaseEntity` mais:
`mensagem_id` (UUID, único, vem do cliente e dá idempotência ao reenvio), `conversa_id` (`VARCHAR(21)`, `<menorId>-<maiorId>`), `usuario_menor_id` e `usuario_maior_id` (os dois
participantes, **sem FK** para `usuario`, como `chat_mensagem`; `CHECK` de menor < maior e de que `conversa_id` bate com os dois), `autor_usuario_id` (anulável: mensagem do sistema),
`autor` (`USUARIO`/`SISTEMA`/`IA`), `texto` (Markdown), `contem_codigo`, `mencoes` (`INTEGER[]`) e `referencias` (`TEXT[]`, `DEMANDA:212`) e, desde a task 220 (migration `0063`), `responde_a_mensagem_id` (`UUID`), `responde_a_autor_usuario_id` (`INTEGER`) e `responde_a_trecho` (`TEXT`): a mensagem
que esta responde, anuláveis e **sempre os três juntos ou nenhum** (`CHECK`), sem FK; o trecho é uma cópia do começo do texto original, gravada no envio. `created_date` é a data da mensagem, definida pela
aplicação em milissegundos (é o que o cursor de paginação compara; editar nunca a muda). `editada_date` (`TIMESTAMPTZ` anulável, migration `0082`, task 313): quando o autor editou o texto pela última vez; nula = nunca editada. O texto original **não** é guardado (I-052); no índice o campo é `editada_date` (`date`). Desde a task 315 (migration `0086`), `autor` também vale `IA` (a resposta do `@IA`, sem `autor_usuario_id`), com `chamada_por_usuario_id` (`INTEGER`, anulável, sem FK: quem chamou a IA, participante da conversa) e `proposta_ids` (`INTEGER[]`, anulável: as propostas do turno; nulo é lido como vazio). Os dois só são gravados na mensagem `IA` e ficam nulos nas demais; no índice são `chamada_por_usuario_id` e `proposta_ids` (`integer`). A coerência (quem chamou participa, propostas inteiras positivas, campos da IA só na mensagem `IA`) é da aplicação (`validarMensagemDiretaNova`), não do banco. Índices: (`conversa_id`, `created_date`, `mensagem_id`), um por participante e GIN em `fn_chat_texto_busca(texto)`.

#### `chat_conversa`
O nome da conversa: `conversa_id` (único), `usuario_id`, `titulo` (vazio = sem nome gravado; vale o padrão "Chat do dia ...") e `titulo_editado` (verdadeiro quando o usuário renomeou; a renomeação automática da IA deixa essa conversa em paz), mais as colunas de `BaseEntity`.

#### Custo da IA (task 202)
Não há tabela de uso nem de preço: `ia_uso` e `ia_modelo_preco` (task 201, migration `0047`) saíram na migration `0048`. O custo é calculado a partir dos tokens gravados em `chat_mensagem` (`modelo`, `tokens_entrada`, `tokens_saida`, `tokens_cache`), somados por dia ou mês e por modelo (`ArmazenamentoDeChat.somarTokens`), e o preço de cada modelo vive em `configuracao_ia.precos_modelo`.

---

## Resumo de Relacionamentos

```
usuario ──────────────────── demanda_usuario ──── demanda
                                                    │
                                                    │ demanda_pai_id (self-ref)
                                                    │
                                              demanda_conexao (grafo)
                                              demanda_tag ──── tag
                                                    │
                                                atividade ──── usuario
                                                    │
                                              atividade_tag ── tag
                                                    │
                                                execucao

projeto ─── demanda
            [acesso via demanda_usuario — sem projeto_usuario]

dia_nao_util  [standalone, consultado pelo módulo ponto]

usuario ─── mensagem_direta_leitura, mensagem_direta_preferencia, mensagem_direta_supervisao, mensagem_direta_reacao
            [chat entre colaboradores; as mensagens ficam no índice, não no PostgreSQL]

usuario ─── grupo_membro, grupo_leitura ─── grupo ─── tipo_grupo
            [grupo livre; os canais usam grupo.projeto_id / grupo.demanda_id; as mensagens ficam no armazenamento do chat]

projeto ─── plano ─── plano_demanda ─── demanda
usuario ─── plano (criador)   [plano amplo: projeto_id nulo, pessoal do criador]
```

---

## Queries de Referência

### Verificar execução ativa de um usuário

```sql
SELECT
  execucao.id,
  execucao.inicio_data,
  atividade.nome AS nome_atividade
FROM execucao
INNER JOIN atividade
  ON atividade.id = execucao.atividade_id
  AND atividade.is_deleted = false
WHERE execucao.fim_data IS NULL
  AND execucao.is_deleted = false
  AND atividade.usuario_id = :usuarioId;
```

### Projetos acessíveis por um desenvolvedor

```sql
SELECT DISTINCT
  projeto.id,
  projeto.nome,
  projeto.codigo,
  projeto.cor,
  projeto.status
FROM projeto
INNER JOIN demanda
  ON demanda.projeto_id = projeto.id
  AND demanda.is_deleted = false
INNER JOIN demanda_usuario
  ON demanda_usuario.demanda_id = demanda.id
  AND demanda_usuario.is_deleted = false
WHERE projeto.is_deleted = false
  AND demanda_usuario.usuario_id = :usuarioId
ORDER BY projeto.nome;
```

### Execuções de um usuário em um dia

```sql
SELECT
  execucao.id,
  execucao.descricao,
  execucao.inicio_data,
  execucao.fim_data,
  atividade.nome  AS nome_atividade,
  demanda.nome    AS nome_demanda
FROM execucao
INNER JOIN atividade
  ON atividade.id = execucao.atividade_id
  AND atividade.is_deleted = false
INNER JOIN demanda
  ON demanda.id = atividade.demanda_id
  AND demanda.is_deleted = false
WHERE execucao.is_deleted = false
  AND atividade.usuario_id = :usuarioId
  AND DATE(execucao.inicio_data) = :data
ORDER BY execucao.inicio_data;
```

### Hierarquia completa de uma demanda (todos os descendentes)

```sql
WITH RECURSIVE arvore_demanda AS (
  SELECT id, demanda_pai_id, nome, 0 AS nivel
  FROM demanda
  WHERE id = :demandaRaizId
    AND is_deleted = false

  UNION ALL

  SELECT
    demanda_filho.id,
    demanda_filho.demanda_pai_id,
    demanda_filho.nome,
    arvore_demanda.nivel + 1
  FROM demanda AS demanda_filho
  INNER JOIN arvore_demanda
    ON demanda_filho.demanda_pai_id = arvore_demanda.id
  WHERE demanda_filho.is_deleted = false
)
SELECT * FROM arvore_demanda ORDER BY nivel, nome;
```

### Verificar se nova conexão criaria ciclo no grafo

```sql
WITH RECURSIVE verificacao_ciclo AS (
  SELECT demanda_destino_id AS id
  FROM demanda_conexao
  WHERE demanda_origem_id = :novoDestinoId
    AND is_deleted = false

  UNION ALL

  SELECT demanda_conexao_proxima.demanda_destino_id
  FROM demanda_conexao AS demanda_conexao_proxima
  INNER JOIN verificacao_ciclo
    ON demanda_conexao_proxima.demanda_origem_id = verificacao_ciclo.id
  WHERE demanda_conexao_proxima.is_deleted = false
)
SELECT EXISTS (
  SELECT 1 FROM verificacao_ciclo WHERE id = :novaOrigemId
) AS criaria_ciclo;
```
