-- UP

ALTER TABLE atividade DROP COLUMN IF EXISTS descricao;

-- DOWN

ALTER TABLE atividade ADD COLUMN descricao TEXT;
