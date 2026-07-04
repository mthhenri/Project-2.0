-- UP

ALTER TABLE usuario ADD COLUMN anotacoes_alteracao_data TIMESTAMPTZ;

-- DOWN

ALTER TABLE usuario DROP COLUMN IF EXISTS anotacoes_alteracao_data;
