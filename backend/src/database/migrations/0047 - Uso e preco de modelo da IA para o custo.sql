-- UP

-- Custos da IA (task 201). Cada chamada bem-sucedida ao provedor grava uma linha em `ia_uso` (modelo e tokens); o custo é calculado na
-- consulta, com o preço vigente do modelo em `ia_modelo_preco`. O preço fica em dólares por milhão de tokens e é editado pelo
-- administrador na aba "Custos" (os modelos mudam e os preços também, então nada disso é constante no código). Nenhuma coluna tem DEFAULT.
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

-- DOWN

DROP TABLE IF EXISTS ia_modelo_preco CASCADE;
DROP TABLE IF EXISTS ia_uso CASCADE;
