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

---

## Convenções deste Schema

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
  anotacoes                 TEXT,
  horas_diarias_necessarias INTEGER      NOT NULL,
  tipo                      VARCHAR(20)  NOT NULL
                              CHECK (tipo IN ('DESENVOLVEDOR', 'GESTOR')),
  status                    VARCHAR(20)  NOT NULL
                              CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE UNIQUE INDEX uix_usuario_login_ativo
  ON usuario(login)
  WHERE is_deleted = false;

CREATE INDEX ix_usuario_tipo
  ON usuario(tipo)
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
  status            VARCHAR(20)  NOT NULL
                      CHECK (status IN ('ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO')),
  inicio_data       DATE,
  previsao_fim_data DATE
);

CREATE UNIQUE INDEX uix_projeto_codigo_ativo
  ON projeto(codigo)
  WHERE is_deleted = false;

CREATE INDEX ix_projeto_status
  ON projeto(status)
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
  descricao_tecnica TEXT,
  descricao_cliente TEXT,
  documentacao      TEXT,
  horas_estimadas   INTEGER      NOT NULL,
  prioridade        VARCHAR(20)  NOT NULL
                      CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
  status            VARCHAR(30)  NOT NULL
                      CHECK (status IN ('PENDENTE', 'PLANEJADA', 'CONCLUIDA')),
  is_estrutural     BOOLEAN      NOT NULL,
  previsao_fim_data DATE
);

CREATE INDEX ix_demanda_projeto
  ON demanda(projeto_id)
  WHERE is_deleted = false;

CREATE INDEX ix_demanda_pai
  ON demanda(demanda_pai_id)
  WHERE is_deleted = false AND demanda_pai_id IS NOT NULL;

CREATE INDEX ix_demanda_status
  ON demanda(status)
  WHERE is_deleted = false;

CREATE INDEX ix_demanda_prioridade
  ON demanda(prioridade)
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
  descricao       TEXT,
  status          VARCHAR(20)  NOT NULL
                    CHECK (status IN ('PLANEJADA', 'PENDENTE', 'DESENVOLVENDO', 'DESENVOLVIDA'))
);

CREATE INDEX ix_atividade_demanda
  ON atividade(demanda_id)
  WHERE is_deleted = false;

CREATE INDEX ix_atividade_usuario
  ON atividade(usuario_id)
  WHERE is_deleted = false;

CREATE INDEX ix_atividade_status
  ON atividade(status)
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

> **Nome da constraint:** o nome atual é `ck_dia_nao_util_duracao` (definido na migration
> `20240014`). A task 70 padroniza o prefixo para `chk_dia_nao_util_duracao`; até a 70 rodar,
> o nome vigente é `ck_dia_nao_util_duracao`.

```sql
CREATE TABLE dia_nao_util (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  dia_data    DATE         NOT NULL,
  descricao   VARCHAR(255) NOT NULL,
  tipo        VARCHAR(30)  NOT NULL
                CHECK (tipo IN ('FERIADO', 'RECESSO', 'PONTO_FACULTATIVO')),
  duracao     VARCHAR(20)  NOT NULL
                CONSTRAINT ck_dia_nao_util_duracao
                CHECK (duracao IN ('INTEGRAL', 'MEIO_PERIODO')),
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
