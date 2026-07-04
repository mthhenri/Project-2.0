-- UP

ALTER TABLE demanda   DROP COLUMN IF EXISTS ordem_exibicao;
ALTER TABLE atividade DROP COLUMN IF EXISTS ordem_exibicao;

-- DOWN

ALTER TABLE demanda ADD COLUMN ordem_exibicao INTEGER;
UPDATE demanda SET ordem_exibicao = 0;
ALTER TABLE demanda ALTER COLUMN ordem_exibicao SET NOT NULL;

ALTER TABLE atividade ADD COLUMN ordem_exibicao INTEGER;
UPDATE atividade SET ordem_exibicao = 0;
ALTER TABLE atividade ALTER COLUMN ordem_exibicao SET NOT NULL;
