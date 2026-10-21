-- UP

-- PROVISÓRIO (task 207): esta tabela NÃO faz parte do modelo definitivo. Ela guarda as mensagens entre colaboradores no Postgres só para o ambiente de
-- teste (CHAT_ARMAZENAMENTO=postgres) funcionar sem um serviço de busca. Na produção de verdade as mensagens ficam no Elasticsearch e esta tabela é
-- removida por uma migration nova (drop de mensagem_direta), junto com MensagemDiretaPostgresRepository e o ramo `postgres` do provider. As funções
-- fn_chat_texto_busca e fn_chat_texto_consulta são da migration 0038 (chat da IA) e só saem depois de chat_mensagem e mensagem_direta, porque o
-- índice de busca desta tabela depende delas. Ver docs/SCHEMA.md, "Tabelas provisórias".
--
-- Um documento do índice `mensagem-direta` vira uma linha: mesmos campos, mesmos nomes. As mensagens são gravadas uma vez e nunca reescritas.
-- Sem FK para `usuario`, como em chat_mensagem e como no índice: o armazenamento recebe filtros explícitos e quem valida a pessoa é a service.

CREATE TABLE mensagem_direta (
  id               SERIAL      PRIMARY KEY,
  created_date     TIMESTAMPTZ NOT NULL,
  updated_date     TIMESTAMPTZ NOT NULL,
  is_deleted       BOOLEAN     NOT NULL,
  deleted_date     TIMESTAMPTZ,

  mensagem_id      UUID        NOT NULL,
  conversa_id      VARCHAR(21) NOT NULL,
  usuario_menor_id INTEGER     NOT NULL,
  usuario_maior_id INTEGER     NOT NULL,
  autor_usuario_id INTEGER,
  autor            VARCHAR(20) NOT NULL,
  texto            TEXT        NOT NULL,
  contem_codigo    BOOLEAN     NOT NULL,
  mencoes          INTEGER[]   NOT NULL,
  referencias      TEXT[]      NOT NULL,

  CONSTRAINT chk_mensagem_direta_pessoas
    CHECK (usuario_menor_id < usuario_maior_id),
  CONSTRAINT chk_mensagem_direta_conversa
    CHECK (conversa_id = usuario_menor_id::text || '-' || usuario_maior_id::text)
);
CREATE UNIQUE INDEX uix_mensagem_direta_mensagem_id ON mensagem_direta(mensagem_id);
CREATE INDEX ix_mensagem_direta_conversa ON mensagem_direta(conversa_id, created_date, mensagem_id) WHERE is_deleted = false;
CREATE INDEX ix_mensagem_direta_usuario_menor ON mensagem_direta(usuario_menor_id) WHERE is_deleted = false;
CREATE INDEX ix_mensagem_direta_usuario_maior ON mensagem_direta(usuario_maior_id) WHERE is_deleted = false;
CREATE INDEX ix_mensagem_direta_texto_busca ON mensagem_direta USING GIN (fn_chat_texto_busca(texto)) WHERE is_deleted = false;
CREATE TRIGGER trg_mensagem_direta_updated_date
  BEFORE UPDATE ON mensagem_direta
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
COMMENT ON TABLE mensagem_direta IS 'PROVISÓRIA (task 207): não existe na produção final, as mensagens entre colaboradores ficam no Elasticsearch.';

-- DOWN

DROP TABLE mensagem_direta;
