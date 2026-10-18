-- UP

-- Prioridades da atividade (task 142), da mais para a menos urgente (`ordem`). `codigo` e `descricao` são fixos; só `cor` muda,
-- e só pelo administrador. A IA define a prioridade ao propor a atividade e a listagem ordena por ela.
CREATE TABLE tipo_atividade_prioridade (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL,
  ordem         INTEGER      NOT NULL,
  cor           VARCHAR(7)   NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_atividade_prioridade_codigo ON tipo_atividade_prioridade(codigo) WHERE is_deleted = false;
CREATE UNIQUE INDEX uix_tipo_atividade_prioridade_ordem ON tipo_atividade_prioridade(ordem) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_atividade_prioridade_updated_date
  BEFORE UPDATE ON tipo_atividade_prioridade
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_atividade_prioridade (codigo, descricao, ordem, cor, created_date, updated_date, is_deleted)
SELECT 'URGENTE', 'Urgente', 1, '#dc2626', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_prioridade (codigo, descricao, ordem, cor, created_date, updated_date, is_deleted)
SELECT 'ALTA', 'Alta', 2, '#f97316', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_prioridade (codigo, descricao, ordem, cor, created_date, updated_date, is_deleted)
SELECT 'MEDIA', 'Média', 3, '#eab308', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_prioridade (codigo, descricao, ordem, cor, created_date, updated_date, is_deleted)
SELECT 'BAIXA', 'Baixa', 4, '#0ea5e9', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_atividade_prioridade (codigo, descricao, ordem, cor, created_date, updated_date, is_deleted)
SELECT 'INDEFINIDA', 'Indefinida', 5, '#94a3b8', NOW(), NOW(), false RETURNING id;

-- atividade.tipo_atividade_prioridade_id: as atividades existentes recebem INDEFINIDA aqui mesmo (não há DEFAULT).
ALTER TABLE atividade ADD COLUMN tipo_atividade_prioridade_id INTEGER;
UPDATE atividade
SET tipo_atividade_prioridade_id = tipo_atividade_prioridade.id
FROM tipo_atividade_prioridade
WHERE tipo_atividade_prioridade.codigo = 'INDEFINIDA'
  AND tipo_atividade_prioridade.is_deleted = false;
ALTER TABLE atividade ALTER COLUMN tipo_atividade_prioridade_id SET NOT NULL;
ALTER TABLE atividade
  ADD CONSTRAINT fk_atividade_tipo_atividade_prioridade
  FOREIGN KEY (tipo_atividade_prioridade_id) REFERENCES tipo_atividade_prioridade(id);
CREATE INDEX ix_atividade_tipo_atividade_prioridade_id
  ON atividade(tipo_atividade_prioridade_id)
  WHERE is_deleted = false;

-- DOWN

DROP INDEX IF EXISTS ix_atividade_tipo_atividade_prioridade_id;
ALTER TABLE atividade DROP CONSTRAINT IF EXISTS fk_atividade_tipo_atividade_prioridade;
ALTER TABLE atividade DROP COLUMN IF EXISTS tipo_atividade_prioridade_id;
DROP TRIGGER IF EXISTS trg_tipo_atividade_prioridade_updated_date ON tipo_atividade_prioridade;
DROP TABLE IF EXISTS tipo_atividade_prioridade CASCADE;
