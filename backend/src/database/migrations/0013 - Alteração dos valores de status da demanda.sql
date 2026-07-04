-- UP

ALTER TABLE demanda DROP CONSTRAINT IF EXISTS demanda_status_check;

UPDATE demanda SET status = 'PENDENTE'  WHERE status = 'PLANEJADA';
UPDATE demanda SET status = 'PLANEJADA' WHERE status = 'EM_DESENVOLVIMENTO';

ALTER TABLE demanda ADD CONSTRAINT demanda_status_check
  CHECK (status IN ('PENDENTE', 'PLANEJADA', 'CONCLUIDA'));

-- DOWN

ALTER TABLE demanda DROP CONSTRAINT IF EXISTS demanda_status_check;
ALTER TABLE demanda ADD CONSTRAINT demanda_status_check
  CHECK (status IN ('PLANEJADA', 'EM_DESENVOLVIMENTO', 'CONCLUIDA'));

UPDATE demanda SET status = 'EM_DESENVOLVIMENTO' WHERE status = 'PLANEJADA';
UPDATE demanda SET status = 'PLANEJADA'          WHERE status = 'PENDENTE';
