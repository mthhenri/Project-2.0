-- UP

-- De onde veio o material de fora de um plano (task 236). Tabela de referência como os demais enums.
CREATE TABLE tipo_plano_fonte_origem (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_plano_fonte_origem_codigo ON tipo_plano_fonte_origem(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_plano_fonte_origem_updated_date
  BEFORE UPDATE ON tipo_plano_fonte_origem
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_plano_fonte_origem (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'COLADO', 'Texto colado', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_plano_fonte_origem (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ARQUIVO', 'Arquivo de texto', NOW(), NOW(), false RETURNING id;

-- Material de fora trazido para o plano (o e-mail do cliente colado, um .txt ou .md). Só o texto é guardado: o arquivo é lido como texto e
-- não vira binário. `titulo` é dado pela pessoa (colado) ou é o nome do arquivo.
CREATE TABLE plano_fonte (
  id                          SERIAL        PRIMARY KEY,
  created_date                TIMESTAMPTZ   NOT NULL,
  updated_date                TIMESTAMPTZ   NOT NULL,
  is_deleted                  BOOLEAN       NOT NULL,
  deleted_date                TIMESTAMPTZ,

  plano_id                    INTEGER       NOT NULL,
  titulo                      VARCHAR(120)  NOT NULL,
  conteudo                    TEXT          NOT NULL,
  tipo_plano_fonte_origem_id  INTEGER       NOT NULL,
  usuario_id                  INTEGER       NOT NULL,

  CONSTRAINT fk_plano_fonte_plano
    FOREIGN KEY (plano_id) REFERENCES plano(id),
  CONSTRAINT fk_plano_fonte_tipo_plano_fonte_origem
    FOREIGN KEY (tipo_plano_fonte_origem_id) REFERENCES tipo_plano_fonte_origem(id),
  CONSTRAINT fk_plano_fonte_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
CREATE INDEX ix_plano_fonte_plano ON plano_fonte(plano_id) WHERE is_deleted = false;
CREATE TRIGGER trg_plano_fonte_updated_date
  BEFORE UPDATE ON plano_fonte
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_plano_fonte_updated_date ON plano_fonte;
DROP TABLE IF EXISTS plano_fonte CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_plano_fonte_origem_updated_date ON tipo_plano_fonte_origem;
DROP TABLE IF EXISTS tipo_plano_fonte_origem CASCADE;
