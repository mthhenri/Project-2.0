-- UP

CREATE TABLE usuario (
  id            SERIAL    PRIMARY KEY,
  created_date  TIMESTAMP NOT NULL,
  updated_date  TIMESTAMP NOT NULL,
  is_deleted    BOOLEAN   NOT NULL,
  deleted_date  TIMESTAMP,

  login                     VARCHAR(100) NOT NULL,
  senha_encriptada          VARCHAR(255) NOT NULL,
  nome_completo             VARCHAR(255) NOT NULL,
  cargo_titulo              VARCHAR(150) NOT NULL,
  anotacoes                 TEXT,
  horas_diarias_necessarias INTEGER      NOT NULL,
  tipo                      VARCHAR(20)  NOT NULL
                              CHECK (tipo IN ('DESENVOLVEDOR', 'GESTOR')),
  status                    VARCHAR(20)  NOT NULL
                              CHECK (status IN ('ATIVO', 'INATIVO'))
);

CREATE UNIQUE INDEX uix_usuario_login_ativo
  ON usuario(login)
  WHERE is_deleted = false;

CREATE INDEX ix_usuario_tipo
  ON usuario(tipo)
  WHERE is_deleted = false;

CREATE TRIGGER trg_usuario_updated_date
  BEFORE UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_usuario_updated_date ON usuario;
DROP TABLE IF EXISTS usuario CASCADE;
