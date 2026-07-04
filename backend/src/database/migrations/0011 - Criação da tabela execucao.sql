-- UP

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
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_execucao_updated_date ON execucao;
DROP TABLE IF EXISTS execucao CASCADE;
