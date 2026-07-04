-- UP

CREATE TABLE ponto_justificativa (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  usuario_id      INTEGER      NOT NULL,
  gestor_id       INTEGER      NOT NULL,
  dia_data        DATE         NOT NULL,
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT         NOT NULL,
  horas_cobertas  NUMERIC(4,2) NOT NULL,

  CONSTRAINT fk_ponto_justificativa_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_ponto_justificativa_gestor
    FOREIGN KEY (gestor_id) REFERENCES usuario(id),
  CONSTRAINT chk_ponto_justificativa_horas_cobertas
    CHECK (horas_cobertas >= 0)
);

CREATE INDEX ix_ponto_justificativa_usuario_dia
  ON ponto_justificativa(usuario_id, dia_data)
  WHERE is_deleted = false;

CREATE TRIGGER trg_ponto_justificativa_updated_date
  BEFORE UPDATE ON ponto_justificativa
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_ponto_justificativa_updated_date ON ponto_justificativa;
DROP TABLE IF EXISTS ponto_justificativa CASCADE;
