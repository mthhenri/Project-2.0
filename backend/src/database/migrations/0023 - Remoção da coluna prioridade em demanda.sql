-- UP

DROP INDEX IF EXISTS ix_demanda_prioridade;
ALTER TABLE demanda DROP COLUMN IF EXISTS prioridade;

-- DOWN

ALTER TABLE demanda ADD COLUMN prioridade VARCHAR(20);
UPDATE demanda SET prioridade = 'MEDIA';
ALTER TABLE demanda ALTER COLUMN prioridade SET NOT NULL;
ALTER TABLE demanda
  ADD CONSTRAINT chk_demanda_prioridade
  CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA'));

CREATE INDEX ix_demanda_prioridade
  ON demanda(prioridade)
  WHERE is_deleted = false;
