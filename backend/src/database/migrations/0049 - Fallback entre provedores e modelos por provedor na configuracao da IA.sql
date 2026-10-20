-- UP

-- Fallback entre provedores de IA e modelos por provedor (task 203). A configuração versionada passa a guardar:
--   * `modelos_provedor` (JSONB): provedor → { modeloRapido, modeloPadrao, modeloAnalitico }, com os modelos de todo provedor já
--     configurado, esteja ele na cadeia ou não. Trocar o provedor padrão e voltar reaproveita o que foi digitado, porque o nome
--     de um modelo não vale em outro provedor. A versão nova copia o mapa inteiro.
--   * `fallbacks` (JSONB): array com os códigos dos provedores de contingência, na ordem em que são tentados.
-- O provedor padrão continua em `tipo_provedor_ia_id`. As três colunas `modelo_*` saem: o trio do padrão passa a ser lido do mapa,
-- sem segunda fonte da verdade. Nenhuma coluna tem DEFAULT: as novas nascem anuláveis, são preenchidas e só então viram NOT NULL.
ALTER TABLE configuracao_ia ADD COLUMN modelos_provedor JSONB;
ALTER TABLE configuracao_ia ADD COLUMN fallbacks JSONB;

UPDATE configuracao_ia
SET modelos_provedor = jsonb_build_object(
      tipo_provedor_ia.codigo,
      jsonb_build_object(
        'modeloRapido',    configuracao_ia.modelo_rapido,
        'modeloPadrao',    configuracao_ia.modelo_padrao,
        'modeloAnalitico', configuracao_ia.modelo_analitico)),
    fallbacks = CAST('[]' AS jsonb)
FROM tipo_provedor_ia
WHERE tipo_provedor_ia.id = configuracao_ia.tipo_provedor_ia_id;

ALTER TABLE configuracao_ia ALTER COLUMN modelos_provedor SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN fallbacks SET NOT NULL;

ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_modelos_provedor CHECK (jsonb_typeof(modelos_provedor) = 'object');
ALTER TABLE configuracao_ia ADD CONSTRAINT chk_configuracao_ia_fallbacks CHECK (jsonb_typeof(fallbacks) = 'array');

ALTER TABLE configuracao_ia DROP COLUMN modelo_rapido;
ALTER TABLE configuracao_ia DROP COLUMN modelo_padrao;
ALTER TABLE configuracao_ia DROP COLUMN modelo_analitico;

-- DOWN

-- Devolve as três colunas com o trio do provedor padrão de cada versão. Os modelos dos outros provedores e os fallbacks se perdem.
ALTER TABLE configuracao_ia ADD COLUMN modelo_rapido VARCHAR(100);
ALTER TABLE configuracao_ia ADD COLUMN modelo_padrao VARCHAR(100);
ALTER TABLE configuracao_ia ADD COLUMN modelo_analitico VARCHAR(100);

UPDATE configuracao_ia
SET modelo_rapido    = configuracao_ia.modelos_provedor -> tipo_provedor_ia.codigo ->> 'modeloRapido',
    modelo_padrao    = configuracao_ia.modelos_provedor -> tipo_provedor_ia.codigo ->> 'modeloPadrao',
    modelo_analitico = configuracao_ia.modelos_provedor -> tipo_provedor_ia.codigo ->> 'modeloAnalitico'
FROM tipo_provedor_ia
WHERE tipo_provedor_ia.id = configuracao_ia.tipo_provedor_ia_id;

ALTER TABLE configuracao_ia ALTER COLUMN modelo_rapido SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN modelo_padrao SET NOT NULL;
ALTER TABLE configuracao_ia ALTER COLUMN modelo_analitico SET NOT NULL;

ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_fallbacks;
ALTER TABLE configuracao_ia DROP CONSTRAINT chk_configuracao_ia_modelos_provedor;
ALTER TABLE configuracao_ia DROP COLUMN fallbacks;
ALTER TABLE configuracao_ia DROP COLUMN modelos_provedor;
