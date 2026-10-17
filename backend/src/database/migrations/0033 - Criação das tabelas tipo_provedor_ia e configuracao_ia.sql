-- UP

-- Provedores de IA que a configuração pode apontar (task 129). Só ANTHROPIC terá implementação (task 130).
CREATE TABLE tipo_provedor_ia (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_provedor_ia_codigo ON tipo_provedor_ia(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_provedor_ia_updated_date
  BEFORE UPDATE ON tipo_provedor_ia
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_provedor_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ANTHROPIC', 'Anthropic', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_provedor_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'GOOGLE', 'Google', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_provedor_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'OPENAI', 'OpenAI', NOW(), NOW(), false RETURNING id;

-- Configuração da IA, uma linha por versão (a ativa é a de maior `versao`). A chave de API do provedor NÃO fica aqui (.env).
CREATE TABLE configuracao_ia (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  versao                       INTEGER      NOT NULL,
  tipo_provedor_ia_id          INTEGER      NOT NULL,
  modelo_rapido                VARCHAR(100) NOT NULL,
  modelo_padrao                VARCHAR(100) NOT NULL,
  modelo_analitico             VARCHAR(100) NOT NULL,
  esforco_analitico            VARCHAR(20)  NOT NULL,
  checkin_minimo_minutos       INTEGER      NOT NULL,
  checkin_maximo_minutos       INTEGER      NOT NULL,
  duracao_recomendada_minutos  INTEGER      NOT NULL,
  checkin_inteligente          BOOLEAN      NOT NULL,
  rigor_proporcional           BOOLEAN      NOT NULL,
  deteccao_automatica          BOOLEAN      NOT NULL,
  ia_desligada                 BOOLEAN      NOT NULL,
  usuario_id                   INTEGER      NOT NULL,

  CONSTRAINT fk_configuracao_ia_tipo_provedor_ia
    FOREIGN KEY (tipo_provedor_ia_id) REFERENCES tipo_provedor_ia(id),
  CONSTRAINT fk_configuracao_ia_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT chk_configuracao_ia_intervalo_checkin
    CHECK (checkin_minimo_minutos < checkin_maximo_minutos)
);

CREATE UNIQUE INDEX uix_configuracao_ia_versao
  ON configuracao_ia(versao)
  WHERE is_deleted = false;

CREATE TRIGGER trg_configuracao_ia_updated_date
  BEFORE UPDATE ON configuracao_ia
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Versão 1: Anthropic, IA desligada (nenhuma migration passa a exigir chave de API; o administrador liga na tela).
INSERT INTO configuracao_ia (
  versao, tipo_provedor_ia_id, modelo_rapido, modelo_padrao, modelo_analitico, esforco_analitico,
  checkin_minimo_minutos, checkin_maximo_minutos, duracao_recomendada_minutos,
  checkin_inteligente, rigor_proporcional, deteccao_automatica, ia_desligada,
  usuario_id, created_date, updated_date, is_deleted
)
SELECT 1, tipo_provedor_ia.id, 'claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'MEDIO',
       30, 80, 90,
       true, true, true, true,
       usuario.id, NOW(), NOW(), false
FROM tipo_provedor_ia
CROSS JOIN usuario
WHERE tipo_provedor_ia.codigo = 'ANTHROPIC'
  AND tipo_provedor_ia.is_deleted = false
  AND usuario.login = 'gestor.inicial';

-- DOWN

DROP TRIGGER IF EXISTS trg_configuracao_ia_updated_date ON configuracao_ia;
DROP TABLE IF EXISTS configuracao_ia CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_provedor_ia_updated_date ON tipo_provedor_ia;
DROP TABLE IF EXISTS tipo_provedor_ia CASCADE;
