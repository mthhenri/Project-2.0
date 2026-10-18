-- UP

-- PROVISÓRIO (task 162): estas duas tabelas NÃO fazem parte do modelo definitivo. Elas guardam as mensagens do chat no Postgres só
-- para o ambiente de teste (CHAT_ARMAZENAMENTO=postgres) funcionar sem um serviço de busca. Na produção de verdade o histórico das
-- conversas fica no Elasticsearch e estas tabelas são removidas por uma migration nova (drop de chat_mensagem, chat_conversa e
-- fn_chat_texto_busca e fn_chat_texto_consulta) junto com ChatMensagemPostgresRepository. Ver docs/SCHEMA.md, "Tabelas provisórias".

CREATE EXTENSION IF NOT EXISTS unaccent;

-- No Supabase (e em outros Postgres gerenciados) as extensões ficam no schema `extensions`, que a conexão da aplicação não enxerga por
-- padrão: por isso as duas funções abaixo fixam o `search_path` delas, e nenhum SQL da aplicação chama `unaccent` diretamente.

-- Busca em português sem acento (`descricao` acha `descrição`), como o analisador do OpenSearch. IMMUTABLE para poder indexar.
CREATE FUNCTION fn_chat_texto_busca(texto TEXT) RETURNS tsvector AS $$
  SELECT to_tsvector('portuguese', unaccent('unaccent', texto))
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, extensions, pg_catalog;

-- O texto digitado na busca, normalizado do mesmo jeito: todas as palavras (AND), sem acento.
CREATE FUNCTION fn_chat_texto_consulta(texto TEXT) RETURNS tsquery AS $$
  SELECT plainto_tsquery('portuguese', unaccent('unaccent', texto))
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, extensions, pg_catalog;

CREATE TABLE chat_mensagem (
  id             SERIAL      PRIMARY KEY,
  created_date   TIMESTAMPTZ NOT NULL,
  updated_date   TIMESTAMPTZ NOT NULL,
  is_deleted     BOOLEAN     NOT NULL,
  deleted_date   TIMESTAMPTZ,

  mensagem_id    UUID         NOT NULL,
  conversa_id    VARCHAR(60)  NOT NULL,
  usuario_id     INTEGER      NOT NULL,
  contexto       VARCHAR(20)  NOT NULL,
  autor          VARCHAR(20)  NOT NULL,
  texto          TEXT         NOT NULL,
  nivel          VARCHAR(20),
  modelo         VARCHAR(100),
  tokens_entrada INTEGER,
  tokens_saida   INTEGER,
  tokens_cache   INTEGER,
  proposta_id    INTEGER,
  execucao_id    INTEGER,
  atividade_id   INTEGER,
  demanda_id     INTEGER,
  conteudo_bruto JSONB
);
CREATE UNIQUE INDEX uix_chat_mensagem_mensagem_id ON chat_mensagem(mensagem_id);
CREATE INDEX ix_chat_mensagem_usuario_conversa ON chat_mensagem(usuario_id, conversa_id, created_date) WHERE is_deleted = false;
CREATE INDEX ix_chat_mensagem_texto_busca ON chat_mensagem USING GIN (fn_chat_texto_busca(texto)) WHERE is_deleted = false;
CREATE TRIGGER trg_chat_mensagem_updated_date
  BEFORE UPDATE ON chat_mensagem
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
COMMENT ON TABLE chat_mensagem IS 'PROVISÓRIA (task 162): não existe na produção final, o histórico do chat fica no Elasticsearch.';

-- Um registro por conversa com o título que a IA deu a ela (separado das mensagens, que nunca são reescritas).
CREATE TABLE chat_conversa (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  conversa_id   VARCHAR(60)  NOT NULL,
  usuario_id    INTEGER      NOT NULL,
  titulo        VARCHAR(200) NOT NULL
);
CREATE UNIQUE INDEX uix_chat_conversa_conversa_id ON chat_conversa(conversa_id);
CREATE TRIGGER trg_chat_conversa_updated_date
  BEFORE UPDATE ON chat_conversa
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
COMMENT ON TABLE chat_conversa IS 'PROVISÓRIA (task 162): não existe na produção final, o histórico do chat fica no Elasticsearch.';

-- DOWN

DROP TABLE chat_conversa;
DROP TABLE chat_mensagem;
DROP FUNCTION fn_chat_texto_consulta(TEXT);
DROP FUNCTION fn_chat_texto_busca(TEXT);
