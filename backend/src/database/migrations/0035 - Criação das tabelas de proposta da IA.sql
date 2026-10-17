-- UP

-- Tipos de proposta da IA (task 136). A lista cresce por migration. Não existe tipo de exclusão: a IA não exclui dados.
CREATE TABLE tipo_proposta_ia (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_proposta_ia_codigo ON tipo_proposta_ia(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_proposta_ia_updated_date
  BEFORE UPDATE ON tipo_proposta_ia
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'INICIAR_EXECUCAO', 'Iniciar execução', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PAUSAR_EXECUCAO', 'Pausar execução', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CRIAR_ATIVIDADE', 'Criar atividade', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESCREVER_EXECUCAO', 'Descrever execução', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'SUSPENDER_CHECKIN', 'Suspender check-ins', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ANOTAR_PAD', 'Anotar no pad', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CRIAR_DEMANDA', 'Criar demanda', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESCREVER_DEMANDA', 'Descrever demanda', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONECTAR_DEMANDA', 'Conectar demanda', NOW(), NOW(), false RETURNING id;

CREATE TABLE tipo_proposta_ia_status (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_proposta_ia_status_codigo ON tipo_proposta_ia_status(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_proposta_ia_status_updated_date
  BEFORE UPDATE ON tipo_proposta_ia_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_proposta_ia_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PENDENTE', 'Pendente', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONFIRMADA', 'Confirmada', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'AJUSTADA', 'Ajustada', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'EXPIRADA', 'Expirada ou recusada', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_proposta_ia_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESFEITA', 'Desfeita', NOW(), NOW(), false RETURNING id;

-- O que a IA propôs e o usuário resolveu. A confirmação é um UPDATE condicional (só PENDENTE passa), então uma ação nunca roda duas vezes.
CREATE TABLE proposta_ia (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  usuario_id                  INTEGER NOT NULL,
  tipo_proposta_ia_id         INTEGER NOT NULL,
  tipo_proposta_ia_status_id  INTEGER NOT NULL,
  dados                       JSONB   NOT NULL,
  resolucao_data              TIMESTAMPTZ,
  resultado                   JSONB,

  CONSTRAINT fk_proposta_ia_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_proposta_ia_tipo_proposta_ia
    FOREIGN KEY (tipo_proposta_ia_id) REFERENCES tipo_proposta_ia(id),
  CONSTRAINT fk_proposta_ia_tipo_proposta_ia_status
    FOREIGN KEY (tipo_proposta_ia_status_id) REFERENCES tipo_proposta_ia_status(id)
);

CREATE INDEX ix_proposta_ia_usuario ON proposta_ia(usuario_id) WHERE is_deleted = false;

CREATE TRIGGER trg_proposta_ia_updated_date
  BEFORE UPDATE ON proposta_ia
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_proposta_ia_updated_date ON proposta_ia;
DROP TABLE IF EXISTS proposta_ia CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_proposta_ia_status_updated_date ON tipo_proposta_ia_status;
DROP TABLE IF EXISTS tipo_proposta_ia_status CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_proposta_ia_updated_date ON tipo_proposta_ia;
DROP TABLE IF EXISTS tipo_proposta_ia CASCADE;
