# SCHEMA.md — Project 2.0

> Schema SQL completo do banco de dados PostgreSQL 16.
> Este arquivo reflete o estado atual das tabelas e deve ser atualizado sempre que uma migration alterar a estrutura.
> Migrations ficam em `backend/src/database/migrations/`.

> **Histórico de migrations além das 12 de criação (`20240001`–`20240012`):**
> - `20240013_alterar_status_demanda` — status de demanda para `PENDENTE, PLANEJADA, CONCLUIDA`.
> - `20240014_adicionar_duracao_dia_nao_util` — coluna `dia_nao_util.duracao` (`INTEGRAL` / `MEIO_PERIODO`).
> - `20240015_seed_usuario_gestor_inicial` — seed idempotente do gestor inicial.
> - `20240016_renomear_funcao_updated_date` — renomeia `fn_atualizar_updated_date` → `fn_set_updated_date` (mecanismo genérico de BaseEntity em inglês; estado final já refletido abaixo).
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
| Trigger | `trg_` | `trg_usuario_updated_date` |
| Function | `fn_` | `fn_set_updated_date` |

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
Sem DEFAULT — a aplicação fornece todos os valores explicitamente no INSERT.

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
13. tipo_provedor_ia, configuracao_ia (migration `0033`; `0049` troca as colunas `modelo_*` por `modelos_provedor` e `fallbacks`; `0055` acrescenta `niveis_proposta`)
14. tipo_prompt, prompt (migration `0034`)
15. tipo_proposta_ia, tipo_proposta_ia_status, proposta_ia (migration `0035`; `0055` acrescenta `aplicada_pela_ia`)
16. tipo_atividade_prioridade e `atividade.tipo_atividade_prioridade_id` (migration `0036`)
17. mensagem_direta_leitura, mensagem_direta_preferencia, mensagem_direta_supervisao (migration `0050`; só dependem de `usuario`)
18. mensagem_direta (migration `0051`, provisória; sem FK, depende só das funções `fn_chat_texto_*` da `0038`)
19. modelagem_grupo, modelagem_tabela (migrations `0052` e `0053`; `modelagem_tabela` referencia `modelagem_grupo`)
```

---

## Função de Trigger — updated_date

Uma função de trigger no PostgreSQL é um bloco de código executado automaticamente
pelo banco antes ou depois de um evento (INSERT, UPDATE, DELETE). Aqui usamos uma
função `BEFORE UPDATE`: ela roda antes de cada UPDATE em qualquer tabela que tenha
o trigger registrado, e pode modificar os valores que serão gravados.

`NEW` é o registro com os novos valores prestes a ser gravados. Ao setar
`NEW.updated_date = NOW()`, garantimos que o campo seja atualizado com o horário
exato do UPDATE — mesmo em scripts externos, migrations ou ferramentas de administração,
sem depender do código TypeScript para isso.

A função é criada uma única vez e reutilizada por todas as tabelas via trigger:

```sql
CREATE OR REPLACE FUNCTION fn_set_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;   -- obrigatório: retorna o registro modificado para o PostgreSQL gravar
END;
$$ LANGUAGE plpgsql;
```

O trigger em cada tabela:

```sql
-- Exemplo: tabela usuario
CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario        -- executa antes de gravar o UPDATE
  FOR EACH ROW                    -- uma vez por linha afetada
  EXECUTE FUNCTION fn_set_updated_date();
```

---

## Tabelas

### usuario

Usuários do sistema. Podem ser desenvolvedores ou gestores.
Gestores têm acesso irrestrito. Desenvolvedores acessam apenas projetos
onde possuem ao menos uma demanda atribuída via `demanda_usuario`.

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
  tipo_usuario_status_id    INTEGER      NOT NULL
                              CONSTRAINT fk_usuario_tipo_usuario_status REFERENCES tipo_usuario_status(id)
);

CREATE UNIQUE INDEX uix_usuario_login_ativo
  ON usuario(login)
  WHERE is_deleted = false;

CREATE INDEX ix_usuario_tipo_usuario_id
  ON usuario(tipo_usuario_id)
  WHERE is_deleted = false;

CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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
  previsao_fim_data DATE,
  volume_esperado_horas_mes INTEGER
                      CONSTRAINT chk_projeto_volume_esperado_horas_mes
                      CHECK (volume_esperado_horas_mes IS NULL OR volume_esperado_horas_mes >= 0)
);

CREATE UNIQUE INDEX uix_projeto_codigo_ativo
  ON projeto(codigo)
  WHERE is_deleted = false;

CREATE INDEX ix_projeto_tipo_projeto_status_id
  ON projeto(tipo_projeto_status_id)
  WHERE is_deleted = false;

CREATE TRIGGER trg_projeto_updated_date
  BEFORE UPDATE ON projeto
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_tag_updated_date
  BEFORE UPDATE ON tag
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
```

---

### demanda

Demandas pertencem a projetos e podem conter sub-demandas (hierarquia recursiva
via `demanda_pai_id`). Demandas também se conectam em grafo via `demanda_conexao`.
`is_estrutural = true` indica que a demanda serve como container de outras demandas.

Ao criar uma demanda, o sistema auto-atribui o criador e todos os gestores ativos
via `demanda_usuario`.

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
  is_estrutural     BOOLEAN      NOT NULL,
  previsao_fim_data DATE
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

CREATE TRIGGER trg_demanda_updated_date
  BEFORE UPDATE ON demanda
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_demanda_usuario_updated_date
  BEFORE UPDATE ON demanda_usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
```

---

### demanda_conexao

Grafo de conexões entre demandas. Uma conexão pode ser unidirecional
(`eh_bidirecional = false`: origem → destino) ou bidirecional
(`eh_bidirecional = true`: origem ↔ destino).

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
  eh_bidirecional     BOOLEAN NOT NULL,

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

CREATE TRIGGER trg_demanda_conexao_updated_date
  BEFORE UPDATE ON demanda_conexao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_demanda_tag_updated_date
  BEFORE UPDATE ON demanda_tag
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_atividade_updated_date
  BEFORE UPDATE ON atividade
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_atividade_tag_updated_date
  BEFORE UPDATE ON atividade_tag
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_execucao_updated_date
  BEFORE UPDATE ON execucao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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

CREATE TRIGGER trg_dia_nao_util_updated_date
  BEFORE UPDATE ON dia_nao_util
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
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
(`.env`). A versão 1 vem por seed (Anthropic, IA **desligada**, check-in entre 30 e 80 minutos, duração recomendada de 90). A migration `0044` acrescentou `duvidas_codigo` e `modo_contexto_chat` (as versões que já existiam ficaram `false` e `MISTURADO`). A `0049` (task 203) moveu os três modelos para `modelos_provedor` (o trio de cada versão foi para a chave do provedor dela) e criou `fallbacks` (`[]` nas versões antigas); o provedor padrão continua em `tipo_provedor_ia_id`. A `0055` (task 228) acrescentou `niveis_proposta` (anulável: as versões que já existiam ficaram sem o mapa e valem o padrão do `shared`). A coerência modelo × provedor (prefixo do nome) e a regra de cadeia sem repetição são da **service**, não do banco: o nome do modelo é texto livre.

```sql
CREATE TABLE configuracao_ia (
  id                           SERIAL      PRIMARY KEY,
  created_date                 TIMESTAMPTZ NOT NULL,
  updated_date                 TIMESTAMPTZ NOT NULL,
  is_deleted                   BOOLEAN     NOT NULL,
  deleted_date                 TIMESTAMPTZ,

  versao                       INTEGER      NOT NULL,
  tipo_provedor_ia_id          INTEGER      NOT NULL CONSTRAINT fk_configuracao_ia_tipo_provedor_ia REFERENCES tipo_provedor_ia(id),
  modelos_provedor             JSONB        NOT NULL,   -- migration 0049: provedor → { modeloRapido, modeloPadrao, modeloAnalitico }, de todo provedor já configurado (da cadeia ou não); a nova versão copia o mapa inteiro
  fallbacks                    JSONB        NOT NULL,   -- migration 0049: array com os códigos dos provedores de contingência, na ordem em que são tentados (até 2; [] = sem fallback)
  esforco_analitico            VARCHAR(20)  NOT NULL,   -- BAIXO/MEDIO/ALTO (EsforcoIaEnum do shared; sem tabela nem CHECK)
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
  CONSTRAINT chk_configuracao_ia_modelos_provedor CHECK (jsonb_typeof(modelos_provedor) = 'object'),
  CONSTRAINT chk_configuracao_ia_fallbacks CHECK (jsonb_typeof(fallbacks) = 'array'),
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
Não existe tipo de exclusão: a IA não exclui dados. A exceção à "confirmação do usuário" é a autonomia da IA (task 228): no nível "Faz e avisa" a própria IA confirma a proposta na hora e ela fica marcada em `aplicada_pela_ia`.

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

### Tabelas de referência (enums) — migration `20240025`

Todo enum de domínio fechado é uma **tabela de referência** `tipo_<tabela>_<complemento?>`
(`SYSTEM.SPEC.md` §5.4, §9.2 #13, §16 #26) — **nunca** `VARCHAR + CHECK` nem `ENUM` nativo. Cada
tabela segue a BaseEntity + `codigo` (valor SCREAMING_SNAKE, espelha o enum TS de `shared/`) +
`descricao` (rótulo legível). A coluna de negócio é um `INTEGER` FK para o `id` dela; o
repositório traduz `codigo ⇄ id` no SQL (subselect no INSERT/UPDATE, JOIN expondo
`codigo AS <campo>` no SELECT/RETURNING). As 7 tabelas:
`tipo_usuario`, `tipo_usuario_status`, `tipo_projeto_status`, `tipo_demanda_status`,
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

CREATE TRIGGER trg_tipo_usuario_updated_date
  BEFORE UPDATE ON tipo_usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
```

Seeds (`codigo` → `descricao`):

| Tabela | Seeds |
|---|---|
| `tipo_usuario` | DESENVOLVEDOR→"Desenvolvedor", GESTOR→"Gestor", ADMINISTRADOR→"Administrador" (migration `0029`) |
| `tipo_usuario_status` | ATIVO→"Ativo", INATIVO→"Inativo" |
| `tipo_projeto_status` | ATIVO→"Ativo", PAUSADO→"Pausado", CONCLUIDO→"Concluído", CANCELADO→"Cancelado" |
| `tipo_demanda_status` | PENDENTE→"Pendente", PLANEJADA→"Planejada", CONCLUIDA→"Concluída" |
| `tipo_atividade_status` | PLANEJADA→"Planejada", PENDENTE→"Pendente", DESENVOLVENDO→"Desenvolvendo", DESENVOLVIDA→"Desenvolvida" |
| `tipo_dia_nao_util` | FERIADO→"Feriado", RECESSO→"Recesso", PONTO_FACULTATIVO→"Ponto facultativo" |
| `tipo_dia_nao_util_duracao` | INTEGRAL→"Integral", MEIO_PERIODO→"Meio período" |
| `tipo_atividade_prioridade` | URGENTE (1, `#dc2626`), ALTA (2, `#f97316`), MEDIA (3, `#eab308`), BAIXA (4, `#0ea5e9`), INDEFINIDA (5, `#94a3b8`), com `ordem` INTEGER (única entre as ativas) e `cor` VARCHAR(7) além do molde; só a `cor` é editável, só pelo administrador (migration `0036`) |
| `tipo_proposta_ia` | INICIAR_EXECUCAO, PAUSAR_EXECUCAO, CRIAR_ATIVIDADE, DESCREVER_EXECUCAO, SUSPENDER_CHECKIN, ANOTAR_PAD, CRIAR_DEMANDA, DESCREVER_DEMANDA, CONECTAR_DEMANDA (migration `0035`; `CRIAR_PROJETO` na `0037`; `ALTERAR_ATIVIDADE` na `0039`; `REGISTRAR_EXECUCAO` e `CORRIGIR_EXECUCAO` na `0040`; `ALTERAR_DEMANDA` na `0041`; `ATRIBUIR_MEMBRO` e `ATRIBUIR_TAG` na `0042`; `CONCLUIR_DEMANDA` e `MOVER_ATIVIDADE` na `0056`; sem tipo de exclusão) |
| `tipo_proposta_ia_status` | PENDENTE, CONFIRMADA, AJUSTADA, EXPIRADA (também a recusada), DESFEITA (migration `0035`) |
| `tipo_prompt` | CONVERSA, CHECKIN, DESCRICAO_EXECUCAO, PAD, PRIORIDADE, ENTREVISTA_DEMANDA, CONEXAO_DEMANDA (migration `0034`), DUVIDA_CODIGO (migration `0044`, com a versão 1 semeada; a lista cresce por migration) |
| `tipo_provedor_ia` | ANTHROPIC→"Anthropic", GOOGLE→"Google", OPENAI→"OpenAI" (migration `0033`; os três têm implementação desde a task 203) |
| `tipo_anotacao` | EM_ANDAMENTO→"Em andamento", FEITO→"Feito", PENDENCIA→"Pendências", LEMBRETE→"Lembretes", PESSOAL→"Pessoal" (migration `0030`, com `ordem` 1 a 5) |

### Chat entre colaboradores — migration `0050` (task 205)

> As **mensagens não ficam no PostgreSQL**: são gravadas uma vez e nunca reescritas, num índice (OpenSearch no desenvolvimento, Elasticsearch na produção final) ou,
> na produção de teste, numa tabela provisória (task 207). Estas três tabelas guardam o **estado que muda**. Modelagem completa em
> `docs/specs/backlog/chat-colaboradores/modelagem.md` (anexo da guarda-chuva `chat-colaboradores.spec.md`; os dois vão para `done/` com a última task, a 215).
>
> `conversa_id` é `<menorUsuarioId>-<maiorUsuarioId>` (ex.: `4-9`): o par sempre cai na mesma conversa e por isso não existe tabela de conversa. Um `CHECK` em cada tabela
> garante que o texto bate com os dois ids da própria linha. Todas têm os campos de `BaseEntity`, nenhum `DEFAULT` e o trigger `trg_*_updated_date`.

#### `mensagem_direta_leitura`
Até onde cada pessoa leu cada conversa e se silenciou os avisos dela. Uma linha por pessoa e conversa, criada na primeira leitura ou no primeiro silêncio. Colunas de `BaseEntity` mais:
`conversa_id` (`VARCHAR(21)`), `usuario_id` e `outro_usuario_id` (FKs para `usuario`, diferentes entre si), `lida_ate_date` (anulável) e `silenciada`.
`lida_ate_date` é o `created_date` da **última mensagem que a pessoa viu**, não o instante da leitura: uma mensagem que chega entre a busca e a marcação nunca é dada como lida sem
ter sido vista. As **não lidas** são as mensagens do outro mais novas que esse ponto; o **"Lida"** de uma mensagem minha vale quando a linha do outro tem `lida_ate_date` maior ou
igual à data dela. Índice único parcial em (`conversa_id`, `usuario_id`) e índice em `usuario_id`.

#### `mensagem_direta_preferencia`
As preferências do chat, uma linha por usuário, criada na primeira alteração: `usuario_id` (FK, único entre as linhas ativas), `avisos_ativos`, `aviso_desktop_ativo`, `som_ativo`,
`silenciado_ate_date` (anulável) e `atalho_global` (`VARCHAR(40)`, formato do Electron). Sem linha, a service devolve `PREFERENCIA_PADRAO_DA_MENSAGEM_DIRETA`, do `shared`
(nunca um `DEFAULT`). "Silenciar por 1 hora" grava o instante final em `silenciado_ate_date`; quem decide se um aviso aparece é a service, comparando com a hora atual, então não
há tarefa agendada para reativar.

#### `mensagem_direta_supervisao`
Auditoria: cada abertura, por gestor ou administrador, de uma conversa que não é dele. Só conversas entre desenvolvedores podem ser abertas (a service confere pelo tipo atual dos
dois usuários). Colunas de `BaseEntity` mais: `leitor_usuario_id`, `conversa_id`, `usuario_menor_id`, `usuario_maior_id` (FKs para `usuario`; `usuario_menor_id < usuario_maior_id`) e
`participantes_avisados` (esta abertura gerou o aviso na conversa; o aviso sai uma vez por leitor, conversa e dia). `created_date` é o instante da abertura. Índice em
(`leitor_usuario_id`, `conversa_id`, `created_date`).

### Tabelas provisórias — migrations `0038` (task 162) e `0051` (task 207)

> **Não fazem parte do modelo definitivo.** Existem só para o ambiente de teste (`CHAT_ARMAZENAMENTO=postgres`) guardar as mensagens do
> chat com a IA (`0038`) e as do chat entre colaboradores (`0051`) sem um serviço de busca. Na produção de verdade o histórico fica no Elasticsearch. **Remoção:** uma migration nova
> derruba, **nesta ordem**, `mensagem_direta`, `chat_conversa`, `chat_mensagem` e só então as funções `fn_chat_texto_busca` e `fn_chat_texto_consulta` (o índice de busca das duas
> tabelas de mensagem depende delas); junto saem `ChatMensagemPostgresRepository` e `MensagemDiretaPostgresRepository` e o ramo `postgres` dos dois providers
> (`armazenamento-de-chat.ts` e `armazenamento-de-mensagem-direta.ts`). As tabelas trazem `COMMENT ON TABLE` com o aviso.

#### `chat_mensagem`
Uma linha por mensagem do chat, gravada uma vez e nunca reescrita (sem exclusão nem alteração pela aplicação). Colunas de `BaseEntity` mais:
`mensagem_id` (UUID, único), `conversa_id` (`<usuarioId>-<yyyy-mm-dd>`), `usuario_id`, `contexto` (`CHAT`/`CHECKIN`), `autor` (`USUARIO`/`IA`/`SISTEMA`), `assunto` (`SISTEMA`/`CODIGO`, anulável: mensagem antiga, do sistema ou do check-in fica sem marca e é lida como `SISTEMA`; migration `0045`), `texto`, `nivel`, `modelo`, `tokens_entrada`, `tokens_saida`, `tokens_cache`, `proposta_id` (a primeira proposta do turno), `propostas_ids` (`INTEGER[]` anulável com todas, na ordem; migration `0054`, task 225: a linha antiga sem ela é lida como `[proposta_id]`), `execucao_id`, `atividade_id`, `demanda_id` (referências opcionais, sem FK) e `conteudo_bruto` (JSONB). `created_date` é a data da mensagem. Índices: (`usuario_id`, `conversa_id`, `created_date`) e GIN em `fn_chat_texto_busca(texto)`, que é `to_tsvector('portuguese', unaccent(texto))` (busca sem acento; exige a extensão `unaccent`). `fn_chat_texto_consulta(texto)` normaliza o texto digitado do mesmo jeito (`plainto_tsquery`). As duas fixam `search_path = public, extensions, pg_catalog`: no Supabase as extensões vivem no schema `extensions`, que a conexão da aplicação não enxerga por padrão, e o SQL da aplicação nunca chama `unaccent` diretamente.

#### `mensagem_direta` (task 207)
Uma linha por mensagem entre colaboradores, com os mesmos campos e nomes do documento do índice `mensagem-direta`; gravada uma vez e nunca reescrita. Colunas de `BaseEntity` mais:
`mensagem_id` (UUID, único, vem do cliente e dá idempotência ao reenvio), `conversa_id` (`VARCHAR(21)`, `<menorId>-<maiorId>`), `usuario_menor_id` e `usuario_maior_id` (os dois
participantes, **sem FK** para `usuario`, como `chat_mensagem`; `CHECK` de menor < maior e de que `conversa_id` bate com os dois), `autor_usuario_id` (anulável: mensagem do sistema),
`autor` (`USUARIO`/`SISTEMA`), `texto` (Markdown), `contem_codigo`, `mencoes` (`INTEGER[]`) e `referencias` (`TEXT[]`, `DEMANDA:212`). `created_date` é a data da mensagem, definida pela
aplicação em milissegundos (é o que o cursor de paginação compara). Índices: (`conversa_id`, `created_date`, `mensagem_id`), um por participante e GIN em `fn_chat_texto_busca(texto)`.

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

usuario ─── mensagem_direta_leitura, mensagem_direta_preferencia, mensagem_direta_supervisao
            [chat entre colaboradores; as mensagens ficam no índice, não no PostgreSQL]
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
