-- UP

-- O status do usuário só tinha ATIVO e INATIVO: vira o booleano `usuario.ativo` e a tabela de referência sai.
-- Nenhuma coluna tem DEFAULT: o valor entra só para preencher os usuários existentes e sai em seguida.
ALTER TABLE usuario ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE usuario ALTER COLUMN ativo DROP DEFAULT;

-- Só os inativos mudam; o gatilho fica desligado para a conversão não alterar o `updated_date` deles.
ALTER TABLE usuario DISABLE TRIGGER trg_usuario_updated_date;
UPDATE usuario
SET ativo = false
FROM tipo_usuario_status
WHERE tipo_usuario_status.id = usuario.tipo_usuario_status_id
  AND tipo_usuario_status.codigo = 'INATIVO';
ALTER TABLE usuario ENABLE TRIGGER trg_usuario_updated_date;

ALTER TABLE usuario DROP CONSTRAINT fk_usuario_tipo_usuario_status;
ALTER TABLE usuario DROP COLUMN tipo_usuario_status_id;

DROP TRIGGER IF EXISTS trg_tipo_usuario_status_updated_date ON tipo_usuario_status;
DROP TABLE tipo_usuario_status;

-- A posição da tabela no diagrama da Modelagem deixa de valer (exclusão lógica, como no resto do sistema).
UPDATE modelagem_tabela
SET is_deleted = true, deleted_date = NOW()
WHERE nome_tabela = 'tipo_usuario_status'
  AND is_deleted = false;

-- DOWN

CREATE TABLE tipo_usuario_status (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_usuario_status_codigo ON tipo_usuario_status(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_usuario_status_updated_date
  BEFORE UPDATE ON tipo_usuario_status
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_usuario_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ATIVO', 'Ativo', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_usuario_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'INATIVO', 'Inativo', NOW(), NOW(), false RETURNING id;

ALTER TABLE usuario ADD COLUMN tipo_usuario_status_id INTEGER;
ALTER TABLE usuario DISABLE TRIGGER trg_usuario_updated_date;
UPDATE usuario
SET tipo_usuario_status_id = tipo_usuario_status.id
FROM tipo_usuario_status
WHERE tipo_usuario_status.codigo = CASE WHEN usuario.ativo THEN 'ATIVO' ELSE 'INATIVO' END
  AND tipo_usuario_status.is_deleted = false;
ALTER TABLE usuario ENABLE TRIGGER trg_usuario_updated_date;
ALTER TABLE usuario ALTER COLUMN tipo_usuario_status_id SET NOT NULL;
ALTER TABLE usuario
  ADD CONSTRAINT fk_usuario_tipo_usuario_status
  FOREIGN KEY (tipo_usuario_status_id) REFERENCES tipo_usuario_status(id);

ALTER TABLE usuario DROP COLUMN ativo;

UPDATE modelagem_tabela
SET is_deleted = false, deleted_date = NULL
WHERE nome_tabela = 'tipo_usuario_status'
  AND is_deleted = true;
