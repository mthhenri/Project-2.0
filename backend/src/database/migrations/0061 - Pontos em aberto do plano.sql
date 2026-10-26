-- UP

-- Situações de um ponto em aberto do plano (task 235). Tabela de referência como os demais enums.
CREATE TABLE tipo_plano_ponto_situacao (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_plano_ponto_situacao_codigo ON tipo_plano_ponto_situacao(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_plano_ponto_situacao_updated_date
  BEFORE UPDATE ON tipo_plano_ponto_situacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_plano_ponto_situacao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ABERTO', 'Em aberto', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_plano_ponto_situacao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'RESOLVIDO', 'Resolvido', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_plano_ponto_situacao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DISPENSADO', 'Dispensado', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_plano_ponto_situacao (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DECISAO', 'Decisão registrada', NOW(), NOW(), false RETURNING id;

-- Ponto em aberto de um plano: a IA (ou a pessoa) anota o que identifica. `rotulo` é texto livre ("Lacuna", "Risco"...), sem lista fechada.
-- `resolucao_texto`: a resposta, o motivo de dispensar ou a decisão.
CREATE TABLE plano_ponto (
  id                            SERIAL       PRIMARY KEY,
  created_date                  TIMESTAMPTZ  NOT NULL,
  updated_date                  TIMESTAMPTZ  NOT NULL,
  is_deleted                    BOOLEAN      NOT NULL,
  deleted_date                  TIMESTAMPTZ,

  plano_id                      INTEGER      NOT NULL,
  rotulo                        VARCHAR(60)  NOT NULL,
  texto                         TEXT         NOT NULL,
  tipo_plano_ponto_situacao_id  INTEGER      NOT NULL,
  resolucao_texto               TEXT,

  CONSTRAINT fk_plano_ponto_plano
    FOREIGN KEY (plano_id) REFERENCES plano(id),
  CONSTRAINT fk_plano_ponto_tipo_plano_ponto_situacao
    FOREIGN KEY (tipo_plano_ponto_situacao_id) REFERENCES tipo_plano_ponto_situacao(id)
);
CREATE INDEX ix_plano_ponto_plano ON plano_ponto(plano_id) WHERE is_deleted = false;
CREATE TRIGGER trg_plano_ponto_updated_date
  BEFORE UPDATE ON plano_ponto
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_plano_ponto_updated_date ON plano_ponto;
DROP TABLE IF EXISTS plano_ponto CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_plano_ponto_situacao_updated_date ON tipo_plano_ponto_situacao;
DROP TABLE IF EXISTS tipo_plano_ponto_situacao CASCADE;
