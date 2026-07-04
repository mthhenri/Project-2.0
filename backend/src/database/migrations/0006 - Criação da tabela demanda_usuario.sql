-- UP

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
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_demanda_usuario_updated_date ON demanda_usuario;
DROP TABLE IF EXISTS demanda_usuario CASCADE;
