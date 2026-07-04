-- UP

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
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_atividade_tag_updated_date ON atividade_tag;
DROP TABLE IF EXISTS atividade_tag CASCADE;
