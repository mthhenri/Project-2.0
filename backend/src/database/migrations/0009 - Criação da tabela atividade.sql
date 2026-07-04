-- UP

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
                    CHECK (status IN ('PLANEJADA', 'PENDENTE', 'DESENVOLVENDO', 'DESENVOLVIDA')),
  ordem_exibicao  INTEGER      NOT NULL
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
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_atividade_updated_date ON atividade;
DROP TABLE IF EXISTS atividade CASCADE;
