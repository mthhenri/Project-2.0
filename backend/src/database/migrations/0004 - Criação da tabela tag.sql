-- UP

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
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_tag_updated_date ON tag;
DROP TABLE IF EXISTS tag CASCADE;
