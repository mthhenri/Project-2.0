-- UP

-- Reações às mensagens do chat entre colaboradores (task 314). A mensagem vive no índice (OpenSearch/Elasticsearch) ou na tabela provisória
-- `mensagem_direta`, então a reação fica numa tabela própria, igual para as três implementações do armazenamento; a service junta as duas coisas.
-- Uma reação por pessoa por mensagem (índice único parcial); trocar é UPDATE e remover é soft delete. `reacao` guarda o próprio emoji, um só
-- (a regra está no `shared`, `ehReacaoValida`). `mensagem_id` não tem FK: a mensagem pode estar fora do PostgreSQL.
CREATE TABLE mensagem_direta_reacao (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  mensagem_id   UUID        NOT NULL,
  conversa_id   VARCHAR(21) NOT NULL,
  usuario_id    INTEGER     NOT NULL,
  reacao        VARCHAR(32) NOT NULL,

  CONSTRAINT fk_mensagem_direta_reacao_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT chk_mensagem_direta_reacao_conversa
    CHECK (conversa_id ~ '^[0-9]+-[0-9]+$')
);
CREATE UNIQUE INDEX uix_mensagem_direta_reacao_mensagem_usuario
  ON mensagem_direta_reacao(mensagem_id, usuario_id) WHERE is_deleted = false;
CREATE INDEX ix_mensagem_direta_reacao_conversa
  ON mensagem_direta_reacao(conversa_id) WHERE is_deleted = false;

-- DOWN

DROP TABLE mensagem_direta_reacao;
