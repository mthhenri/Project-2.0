-- UP

-- Seções do pad de cada usuário (task 125). A ordem de exibição é a coluna `ordem`.
CREATE TABLE tipo_anotacao (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL,
  ordem         INTEGER      NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_anotacao_codigo ON tipo_anotacao(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_anotacao_updated_date
  BEFORE UPDATE ON tipo_anotacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_anotacao (codigo, descricao, ordem, created_date, updated_date, is_deleted)
SELECT 'EM_ANDAMENTO', 'Em andamento', 1, NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_anotacao (codigo, descricao, ordem, created_date, updated_date, is_deleted)
SELECT 'FEITO', 'Feito', 2, NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_anotacao (codigo, descricao, ordem, created_date, updated_date, is_deleted)
SELECT 'PENDENCIA', 'Pendências', 3, NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_anotacao (codigo, descricao, ordem, created_date, updated_date, is_deleted)
SELECT 'LEMBRETE', 'Lembretes', 4, NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_anotacao (codigo, descricao, ordem, created_date, updated_date, is_deleted)
SELECT 'PESSOAL', 'Pessoal', 5, NOW(), NOW(), false RETURNING id;

-- Uma linha por usuário e por seção; seção vazia é '' (Markdown).
CREATE TABLE anotacao (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  usuario_id        INTEGER NOT NULL,
  tipo_anotacao_id  INTEGER NOT NULL,
  texto             TEXT    NOT NULL,

  CONSTRAINT fk_anotacao_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_anotacao_tipo_anotacao
    FOREIGN KEY (tipo_anotacao_id) REFERENCES tipo_anotacao(id)
);

CREATE UNIQUE INDEX uix_anotacao_usuario_tipo_ativa
  ON anotacao(usuario_id, tipo_anotacao_id)
  WHERE is_deleted = false;

CREATE TRIGGER trg_anotacao_updated_date
  BEFORE UPDATE ON anotacao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- As 5 seções de quem já existe (inclusive usuários excluídos: a restauração devolve o pad). O texto atual de
-- `usuario.anotacoes` é copiado na migration seguinte (task 126), junto com a troca da tela.
INSERT INTO anotacao (usuario_id, tipo_anotacao_id, texto, created_date, updated_date, is_deleted)
SELECT usuario.id, tipo_anotacao.id, '', NOW(), NOW(), false
FROM usuario
CROSS JOIN tipo_anotacao
WHERE tipo_anotacao.is_deleted = false;

-- DOWN

DROP TRIGGER IF EXISTS trg_anotacao_updated_date ON anotacao;
DROP TABLE IF EXISTS anotacao CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_anotacao_updated_date ON tipo_anotacao;
DROP TABLE IF EXISTS tipo_anotacao CASCADE;
