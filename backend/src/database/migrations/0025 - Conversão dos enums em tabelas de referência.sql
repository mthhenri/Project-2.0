-- UP

-- 1. Criar as 7 tabelas de referência (BaseEntity + codigo + descricao).

CREATE TABLE tipo_usuario (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_usuario_codigo ON tipo_usuario(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_usuario_updated_date
  BEFORE UPDATE ON tipo_usuario
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_usuario_status (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_usuario_status_codigo ON tipo_usuario_status(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_usuario_status_updated_date
  BEFORE UPDATE ON tipo_usuario_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_projeto_status (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_projeto_status_codigo ON tipo_projeto_status(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_projeto_status_updated_date
  BEFORE UPDATE ON tipo_projeto_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_demanda_status (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_demanda_status_codigo ON tipo_demanda_status(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_demanda_status_updated_date
  BEFORE UPDATE ON tipo_demanda_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_atividade_status (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_atividade_status_codigo ON tipo_atividade_status(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_atividade_status_updated_date
  BEFORE UPDATE ON tipo_atividade_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_dia_nao_util (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_dia_nao_util_codigo ON tipo_dia_nao_util(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_dia_nao_util_updated_date
  BEFORE UPDATE ON tipo_dia_nao_util
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE tipo_dia_nao_util_duracao (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_dia_nao_util_duracao_codigo ON tipo_dia_nao_util_duracao(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_dia_nao_util_duracao_updated_date
  BEFORE UPDATE ON tipo_dia_nao_util_duracao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- 2. Seedar as 7 tabelas (INSERT ... SELECT ... RETURNING — sem VALUES/DEFAULT).

INSERT INTO tipo_usuario (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESENVOLVEDOR', 'Desenvolvedor', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_usuario (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'GESTOR', 'Gestor', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_usuario_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ATIVO', 'Ativo', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_usuario_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'INATIVO', 'Inativo', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_projeto_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ATIVO', 'Ativo', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_projeto_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PAUSADO', 'Pausado', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_projeto_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONCLUIDO', 'Concluído', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_projeto_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CANCELADO', 'Cancelado', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_demanda_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PENDENTE', 'Pendente', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_demanda_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANEJADA', 'Planejada', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_demanda_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONCLUIDA', 'Concluída', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_atividade_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PLANEJADA', 'Planejada', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PENDENTE', 'Pendente', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESENVOLVENDO', 'Desenvolvendo', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESENVOLVIDA', 'Desenvolvida', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_dia_nao_util (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'FERIADO', 'Feriado', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_dia_nao_util (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'RECESSO', 'Recesso', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_dia_nao_util (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PONTO_FACULTATIVO', 'Ponto facultativo', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_dia_nao_util_duracao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'INTEGRAL', 'Integral', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_dia_nao_util_duracao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'MEIO_PERIODO', 'Meio período', NOW(), NOW(), false RETURNING id;

-- 3. Converter cada coluna de enum em FK para a tabela de referência.

-- usuario.tipo -> tipo_usuario_id
ALTER TABLE usuario ADD COLUMN tipo_usuario_id INTEGER;
UPDATE usuario
SET tipo_usuario_id = tipo_usuario.id
FROM tipo_usuario
WHERE tipo_usuario.codigo = usuario.tipo
  AND tipo_usuario.is_deleted = false;
ALTER TABLE usuario ALTER COLUMN tipo_usuario_id SET NOT NULL;
ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_tipo_usuario
  FOREIGN KEY (tipo_usuario_id) REFERENCES tipo_usuario(id);
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_tipo_check;
DROP INDEX IF EXISTS ix_usuario_tipo;
CREATE INDEX ix_usuario_tipo_usuario_id
  ON usuario(tipo_usuario_id)
  WHERE is_deleted = false;
ALTER TABLE usuario DROP COLUMN tipo;

-- usuario.status -> tipo_usuario_status_id
ALTER TABLE usuario ADD COLUMN tipo_usuario_status_id INTEGER;
UPDATE usuario
SET tipo_usuario_status_id = tipo_usuario_status.id
FROM tipo_usuario_status
WHERE tipo_usuario_status.codigo = usuario.status
  AND tipo_usuario_status.is_deleted = false;
ALTER TABLE usuario ALTER COLUMN tipo_usuario_status_id SET NOT NULL;
ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_tipo_usuario_status
  FOREIGN KEY (tipo_usuario_status_id) REFERENCES tipo_usuario_status(id);
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_status_check;
ALTER TABLE usuario DROP COLUMN status;

-- projeto.status -> tipo_projeto_status_id
ALTER TABLE projeto ADD COLUMN tipo_projeto_status_id INTEGER;
UPDATE projeto
SET tipo_projeto_status_id = tipo_projeto_status.id
FROM tipo_projeto_status
WHERE tipo_projeto_status.codigo = projeto.status
  AND tipo_projeto_status.is_deleted = false;
ALTER TABLE projeto ALTER COLUMN tipo_projeto_status_id SET NOT NULL;
ALTER TABLE projeto
  ADD CONSTRAINT fk_projeto_tipo_projeto_status
  FOREIGN KEY (tipo_projeto_status_id) REFERENCES tipo_projeto_status(id);
ALTER TABLE projeto DROP CONSTRAINT IF EXISTS projeto_status_check;
DROP INDEX IF EXISTS ix_projeto_status;
CREATE INDEX ix_projeto_tipo_projeto_status_id
  ON projeto(tipo_projeto_status_id)
  WHERE is_deleted = false;
ALTER TABLE projeto DROP COLUMN status;

-- demanda.status -> tipo_demanda_status_id
ALTER TABLE demanda ADD COLUMN tipo_demanda_status_id INTEGER;
UPDATE demanda
SET tipo_demanda_status_id = tipo_demanda_status.id
FROM tipo_demanda_status
WHERE tipo_demanda_status.codigo = demanda.status
  AND tipo_demanda_status.is_deleted = false;
ALTER TABLE demanda ALTER COLUMN tipo_demanda_status_id SET NOT NULL;
ALTER TABLE demanda
  ADD CONSTRAINT fk_demanda_tipo_demanda_status
  FOREIGN KEY (tipo_demanda_status_id) REFERENCES tipo_demanda_status(id);
ALTER TABLE demanda DROP CONSTRAINT IF EXISTS chk_demanda_status;
DROP INDEX IF EXISTS ix_demanda_status;
CREATE INDEX ix_demanda_tipo_demanda_status_id
  ON demanda(tipo_demanda_status_id)
  WHERE is_deleted = false;
ALTER TABLE demanda DROP COLUMN status;

-- atividade.status -> tipo_atividade_status_id
ALTER TABLE atividade ADD COLUMN tipo_atividade_status_id INTEGER;
UPDATE atividade
SET tipo_atividade_status_id = tipo_atividade_status.id
FROM tipo_atividade_status
WHERE tipo_atividade_status.codigo = atividade.status
  AND tipo_atividade_status.is_deleted = false;
ALTER TABLE atividade ALTER COLUMN tipo_atividade_status_id SET NOT NULL;
ALTER TABLE atividade
  ADD CONSTRAINT fk_atividade_tipo_atividade_status
  FOREIGN KEY (tipo_atividade_status_id) REFERENCES tipo_atividade_status(id);
ALTER TABLE atividade DROP CONSTRAINT IF EXISTS atividade_status_check;
DROP INDEX IF EXISTS ix_atividade_status;
CREATE INDEX ix_atividade_tipo_atividade_status_id
  ON atividade(tipo_atividade_status_id)
  WHERE is_deleted = false;
ALTER TABLE atividade DROP COLUMN status;

-- dia_nao_util.tipo -> tipo_dia_nao_util_id
ALTER TABLE dia_nao_util ADD COLUMN tipo_dia_nao_util_id INTEGER;
UPDATE dia_nao_util
SET tipo_dia_nao_util_id = tipo_dia_nao_util.id
FROM tipo_dia_nao_util
WHERE tipo_dia_nao_util.codigo = dia_nao_util.tipo
  AND tipo_dia_nao_util.is_deleted = false;
ALTER TABLE dia_nao_util ALTER COLUMN tipo_dia_nao_util_id SET NOT NULL;
ALTER TABLE dia_nao_util
  ADD CONSTRAINT fk_dia_nao_util_tipo_dia_nao_util
  FOREIGN KEY (tipo_dia_nao_util_id) REFERENCES tipo_dia_nao_util(id);
ALTER TABLE dia_nao_util DROP CONSTRAINT IF EXISTS dia_nao_util_tipo_check;
ALTER TABLE dia_nao_util DROP COLUMN tipo;

-- dia_nao_util.duracao -> tipo_dia_nao_util_duracao_id
ALTER TABLE dia_nao_util ADD COLUMN tipo_dia_nao_util_duracao_id INTEGER;
UPDATE dia_nao_util
SET tipo_dia_nao_util_duracao_id = tipo_dia_nao_util_duracao.id
FROM tipo_dia_nao_util_duracao
WHERE tipo_dia_nao_util_duracao.codigo = dia_nao_util.duracao
  AND tipo_dia_nao_util_duracao.is_deleted = false;
ALTER TABLE dia_nao_util ALTER COLUMN tipo_dia_nao_util_duracao_id SET NOT NULL;
ALTER TABLE dia_nao_util
  ADD CONSTRAINT fk_dia_nao_util_tipo_dia_nao_util_duracao
  FOREIGN KEY (tipo_dia_nao_util_duracao_id) REFERENCES tipo_dia_nao_util_duracao(id);
ALTER TABLE dia_nao_util DROP CONSTRAINT IF EXISTS chk_dia_nao_util_duracao;
ALTER TABLE dia_nao_util DROP COLUMN duracao;

-- DOWN

-- 1. Reverter cada coluna: recriar VARCHAR + CHECK + índice antigo, repopular via JOIN.

-- usuario.tipo
ALTER TABLE usuario ADD COLUMN tipo VARCHAR(20);
UPDATE usuario
SET tipo = tipo_usuario.codigo
FROM tipo_usuario
WHERE tipo_usuario.id = usuario.tipo_usuario_id;
ALTER TABLE usuario ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE usuario
  ADD CONSTRAINT usuario_tipo_check
  CHECK (tipo IN ('DESENVOLVEDOR', 'GESTOR'));
CREATE INDEX ix_usuario_tipo
  ON usuario(tipo)
  WHERE is_deleted = false;
DROP INDEX IF EXISTS ix_usuario_tipo_usuario_id;
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS fk_usuario_tipo_usuario;
ALTER TABLE usuario DROP COLUMN tipo_usuario_id;

-- usuario.status
ALTER TABLE usuario ADD COLUMN status VARCHAR(20);
UPDATE usuario
SET status = tipo_usuario_status.codigo
FROM tipo_usuario_status
WHERE tipo_usuario_status.id = usuario.tipo_usuario_status_id;
ALTER TABLE usuario ALTER COLUMN status SET NOT NULL;
ALTER TABLE usuario
  ADD CONSTRAINT usuario_status_check
  CHECK (status IN ('ATIVO', 'INATIVO'));
ALTER TABLE usuario DROP CONSTRAINT IF EXISTS fk_usuario_tipo_usuario_status;
ALTER TABLE usuario DROP COLUMN tipo_usuario_status_id;

-- projeto.status
ALTER TABLE projeto ADD COLUMN status VARCHAR(20);
UPDATE projeto
SET status = tipo_projeto_status.codigo
FROM tipo_projeto_status
WHERE tipo_projeto_status.id = projeto.tipo_projeto_status_id;
ALTER TABLE projeto ALTER COLUMN status SET NOT NULL;
ALTER TABLE projeto
  ADD CONSTRAINT projeto_status_check
  CHECK (status IN ('ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'));
CREATE INDEX ix_projeto_status
  ON projeto(status)
  WHERE is_deleted = false;
DROP INDEX IF EXISTS ix_projeto_tipo_projeto_status_id;
ALTER TABLE projeto DROP CONSTRAINT IF EXISTS fk_projeto_tipo_projeto_status;
ALTER TABLE projeto DROP COLUMN tipo_projeto_status_id;

-- demanda.status
ALTER TABLE demanda ADD COLUMN status VARCHAR(30);
UPDATE demanda
SET status = tipo_demanda_status.codigo
FROM tipo_demanda_status
WHERE tipo_demanda_status.id = demanda.tipo_demanda_status_id;
ALTER TABLE demanda ALTER COLUMN status SET NOT NULL;
ALTER TABLE demanda
  ADD CONSTRAINT chk_demanda_status
  CHECK (status IN ('PENDENTE', 'PLANEJADA', 'CONCLUIDA'));
CREATE INDEX ix_demanda_status
  ON demanda(status)
  WHERE is_deleted = false;
DROP INDEX IF EXISTS ix_demanda_tipo_demanda_status_id;
ALTER TABLE demanda DROP CONSTRAINT IF EXISTS fk_demanda_tipo_demanda_status;
ALTER TABLE demanda DROP COLUMN tipo_demanda_status_id;

-- atividade.status
ALTER TABLE atividade ADD COLUMN status VARCHAR(20);
UPDATE atividade
SET status = tipo_atividade_status.codigo
FROM tipo_atividade_status
WHERE tipo_atividade_status.id = atividade.tipo_atividade_status_id;
ALTER TABLE atividade ALTER COLUMN status SET NOT NULL;
ALTER TABLE atividade
  ADD CONSTRAINT atividade_status_check
  CHECK (status IN ('PLANEJADA', 'PENDENTE', 'DESENVOLVENDO', 'DESENVOLVIDA'));
CREATE INDEX ix_atividade_status
  ON atividade(status)
  WHERE is_deleted = false;
DROP INDEX IF EXISTS ix_atividade_tipo_atividade_status_id;
ALTER TABLE atividade DROP CONSTRAINT IF EXISTS fk_atividade_tipo_atividade_status;
ALTER TABLE atividade DROP COLUMN tipo_atividade_status_id;

-- dia_nao_util.tipo
ALTER TABLE dia_nao_util ADD COLUMN tipo VARCHAR(30);
UPDATE dia_nao_util
SET tipo = tipo_dia_nao_util.codigo
FROM tipo_dia_nao_util
WHERE tipo_dia_nao_util.id = dia_nao_util.tipo_dia_nao_util_id;
ALTER TABLE dia_nao_util ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE dia_nao_util
  ADD CONSTRAINT dia_nao_util_tipo_check
  CHECK (tipo IN ('FERIADO', 'RECESSO', 'PONTO_FACULTATIVO'));
ALTER TABLE dia_nao_util DROP CONSTRAINT IF EXISTS fk_dia_nao_util_tipo_dia_nao_util;
ALTER TABLE dia_nao_util DROP COLUMN tipo_dia_nao_util_id;

-- dia_nao_util.duracao
ALTER TABLE dia_nao_util ADD COLUMN duracao VARCHAR(20);
UPDATE dia_nao_util
SET duracao = tipo_dia_nao_util_duracao.codigo
FROM tipo_dia_nao_util_duracao
WHERE tipo_dia_nao_util_duracao.id = dia_nao_util.tipo_dia_nao_util_duracao_id;
ALTER TABLE dia_nao_util ALTER COLUMN duracao SET NOT NULL;
ALTER TABLE dia_nao_util
  ADD CONSTRAINT chk_dia_nao_util_duracao
  CHECK (duracao IN ('INTEGRAL', 'MEIO_PERIODO'));
ALTER TABLE dia_nao_util DROP CONSTRAINT IF EXISTS fk_dia_nao_util_tipo_dia_nao_util_duracao;
ALTER TABLE dia_nao_util DROP COLUMN tipo_dia_nao_util_duracao_id;

-- 2. Dropar as 7 tabelas de referência.
DROP TRIGGER IF EXISTS trg_tipo_usuario_updated_date ON tipo_usuario;
DROP TABLE IF EXISTS tipo_usuario CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_usuario_status_updated_date ON tipo_usuario_status;
DROP TABLE IF EXISTS tipo_usuario_status CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_projeto_status_updated_date ON tipo_projeto_status;
DROP TABLE IF EXISTS tipo_projeto_status CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_demanda_status_updated_date ON tipo_demanda_status;
DROP TABLE IF EXISTS tipo_demanda_status CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_atividade_status_updated_date ON tipo_atividade_status;
DROP TABLE IF EXISTS tipo_atividade_status CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_dia_nao_util_updated_date ON tipo_dia_nao_util;
DROP TABLE IF EXISTS tipo_dia_nao_util CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_dia_nao_util_duracao_updated_date ON tipo_dia_nao_util_duracao;
DROP TABLE IF EXISTS tipo_dia_nao_util_duracao CASCADE;
