-- UP

-- Custos da IA pelas mensagens do chat (task 202). O custo passa a vir dos tokens já gravados em cada mensagem (task 188), então a tabela
-- de uso por chamada (`ia_uso`, 0047) sai. O preço de cada modelo (dólar por milhão de tokens) passa para a configuração da IA, num JSONB
-- `modelo → { precoEntradaMilhao, precoSaidaMilhao, precoCacheMilhao }`, e `ia_modelo_preco` sai depois de copiada. Nenhuma coluna tem DEFAULT:
-- a coluna nasce anulável, é preenchida e só então vira NOT NULL.
ALTER TABLE configuracao_ia ADD COLUMN precos_modelo JSONB;

UPDATE configuracao_ia
SET precos_modelo = COALESCE(
  (SELECT jsonb_object_agg(
            ia_modelo_preco.modelo,
            jsonb_build_object(
              'precoEntradaMilhao', ia_modelo_preco.preco_entrada_milhao,
              'precoSaidaMilhao',   ia_modelo_preco.preco_saida_milhao,
              'precoCacheMilhao',   ia_modelo_preco.preco_cache_milhao))
   FROM ia_modelo_preco
   WHERE ia_modelo_preco.is_deleted = false),
  CAST('{}' AS jsonb));

ALTER TABLE configuracao_ia ALTER COLUMN precos_modelo SET NOT NULL;

DROP TABLE ia_modelo_preco;
DROP TABLE ia_uso;

-- DOWN

CREATE TABLE ia_uso (
  id              SERIAL       PRIMARY KEY,
  created_date    TIMESTAMPTZ  NOT NULL,
  updated_date    TIMESTAMPTZ  NOT NULL,
  is_deleted      BOOLEAN      NOT NULL,
  deleted_date    TIMESTAMPTZ,

  uso_data        TIMESTAMPTZ  NOT NULL,
  modelo          VARCHAR(100) NOT NULL,
  tokens_entrada  INTEGER      NOT NULL,
  tokens_saida    INTEGER      NOT NULL,
  tokens_cache    INTEGER      NOT NULL,

  CONSTRAINT chk_ia_uso_tokens CHECK (tokens_entrada >= 0 AND tokens_saida >= 0 AND tokens_cache >= 0)
);
CREATE INDEX ix_ia_uso_uso_data ON ia_uso(uso_data) WHERE is_deleted = false;
CREATE TRIGGER trg_ia_uso_updated_date
  BEFORE UPDATE ON ia_uso
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

CREATE TABLE ia_modelo_preco (
  id                      SERIAL       PRIMARY KEY,
  created_date            TIMESTAMPTZ  NOT NULL,
  updated_date            TIMESTAMPTZ  NOT NULL,
  is_deleted              BOOLEAN      NOT NULL,
  deleted_date            TIMESTAMPTZ,

  modelo                  VARCHAR(100)  NOT NULL,
  preco_entrada_milhao    NUMERIC(12,4) NOT NULL,
  preco_saida_milhao      NUMERIC(12,4) NOT NULL,
  preco_cache_milhao      NUMERIC(12,4) NOT NULL,

  CONSTRAINT chk_ia_modelo_preco_precos CHECK (preco_entrada_milhao >= 0 AND preco_saida_milhao >= 0 AND preco_cache_milhao >= 0)
);
CREATE UNIQUE INDEX uix_ia_modelo_preco_modelo_ativo ON ia_modelo_preco(modelo) WHERE is_deleted = false;
CREATE TRIGGER trg_ia_modelo_preco_updated_date
  BEFORE UPDATE ON ia_modelo_preco
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Devolve os preços da versão ativa (a de maior `versao`) para a tabela.
INSERT INTO ia_modelo_preco (created_date, updated_date, is_deleted, modelo, preco_entrada_milhao, preco_saida_milhao, preco_cache_milhao)
SELECT NOW(), NOW(), false,
       preco.key,
       CAST(preco.value ->> 'precoEntradaMilhao' AS numeric),
       CAST(preco.value ->> 'precoSaidaMilhao' AS numeric),
       CAST(preco.value ->> 'precoCacheMilhao' AS numeric)
FROM jsonb_each((SELECT configuracao_ia.precos_modelo
                 FROM configuracao_ia
                 WHERE configuracao_ia.is_deleted = false
                 ORDER BY configuracao_ia.versao DESC
                 LIMIT 1)) AS preco;

ALTER TABLE configuracao_ia DROP COLUMN precos_modelo;
