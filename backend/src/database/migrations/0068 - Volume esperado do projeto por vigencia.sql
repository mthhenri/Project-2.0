-- UP

CREATE TABLE projeto_volume_vigencia (
  id SERIAL CONSTRAINT pk_projeto_volume_vigencia PRIMARY KEY,
  created_date TIMESTAMPTZ NOT NULL,
  updated_date TIMESTAMPTZ NOT NULL,
  is_deleted BOOLEAN NOT NULL,
  deleted_date TIMESTAMPTZ,
  projeto_id INTEGER NOT NULL CONSTRAINT fk_projeto_volume_vigencia_projeto REFERENCES projeto(id),
  vigencia_inicio_data DATE NOT NULL,
  volume_esperado_horas INTEGER,
  CONSTRAINT chk_projeto_volume_vigencia_volume CHECK (volume_esperado_horas >= 0),
  CONSTRAINT chk_projeto_volume_vigencia_inicio CHECK (EXTRACT(DAY FROM vigencia_inicio_data) = 1)
);
CREATE UNIQUE INDEX uix_projeto_volume_vigencia_mes_ativo
  ON projeto_volume_vigencia (projeto_id, vigencia_inicio_data) WHERE is_deleted = false;
CREATE TRIGGER trg_projeto_volume_vigencia_updated_date BEFORE UPDATE ON projeto_volume_vigencia
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Sem início informado, usa o mês de criação. Inclui projetos excluídos para preservar a restauração.
INSERT INTO projeto_volume_vigencia
  (projeto_id, vigencia_inicio_data, volume_esperado_horas, created_date, updated_date, is_deleted, deleted_date)
SELECT projeto.id, date_trunc('month', COALESCE(projeto.inicio_data, projeto.created_date::date))::date,
  projeto.volume_esperado_horas_mes, NOW(), NOW(), false, NULL
FROM projeto WHERE projeto.volume_esperado_horas_mes IS NOT NULL;

ALTER TABLE projeto DROP CONSTRAINT chk_projeto_volume_esperado_horas_mes;
ALTER TABLE projeto DROP COLUMN volume_esperado_horas_mes;

-- DOWN

ALTER TABLE projeto ADD COLUMN volume_esperado_horas_mes INTEGER;
ALTER TABLE projeto ADD CONSTRAINT chk_projeto_volume_esperado_horas_mes CHECK (volume_esperado_horas_mes >= 0);
UPDATE projeto SET volume_esperado_horas_mes = (
  SELECT projeto_volume_vigencia.volume_esperado_horas FROM projeto_volume_vigencia
  WHERE projeto_volume_vigencia.projeto_id = projeto.id AND projeto_volume_vigencia.is_deleted = false
  ORDER BY projeto_volume_vigencia.vigencia_inicio_data DESC LIMIT 1
);
DROP TABLE projeto_volume_vigencia;
