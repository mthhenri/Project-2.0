-- UP

-- Plano do modo planejamento do chat com a IA (task 232). O plano é um documento com três textos Markdown (o rascunho das descrições técnica e do cliente
-- e da documentação de uma demanda), que vive vários dias e só grava na demanda quando a pessoa publica (task 237). `projeto_id` anulável: plano amplo,
-- pessoal do criador. `is_solo`: o criador não compartilha o plano com o projeto. `versao` sobe a cada gravação e é a base da recusa de gravação sobre
-- versão mais nova (sem coedição ao vivo). Ver docs/SCHEMA.md e docs/specs/*/chat-planejamento/modelagem.md.
CREATE TABLE plano (
  id                 SERIAL       PRIMARY KEY,
  created_date       TIMESTAMPTZ  NOT NULL,
  updated_date       TIMESTAMPTZ  NOT NULL,
  is_deleted         BOOLEAN      NOT NULL,
  deleted_date       TIMESTAMPTZ,

  titulo             VARCHAR(255) NOT NULL,
  projeto_id         INTEGER,
  usuario_id         INTEGER      NOT NULL,
  is_solo            BOOLEAN      NOT NULL,
  is_arquivado       BOOLEAN      NOT NULL,
  descricao_tecnica  TEXT,
  descricao_cliente  TEXT,
  documentacao       TEXT,
  versao             INTEGER      NOT NULL,

  CONSTRAINT fk_plano_projeto
    FOREIGN KEY (projeto_id) REFERENCES projeto(id),
  CONSTRAINT fk_plano_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT chk_plano_versao_positiva
    CHECK (versao >= 1)
);
CREATE INDEX ix_plano_projeto ON plano(projeto_id) WHERE is_deleted = false;
CREATE INDEX ix_plano_usuario ON plano(usuario_id) WHERE is_deleted = false;
CREATE TRIGGER trg_plano_updated_date
  BEFORE UPDATE ON plano
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Ligação do plano com a demanda para a qual ele publica. A guarda-chuva admite uma linha ativa por plano (a service garante); a tabela já admite várias
-- para o projeto futuro "plano que vira várias demandas". `publicacao_data` anulável: ligado e ainda não publicado. É daqui que o detalhe da demanda
-- tira o "nasceu do plano".
CREATE TABLE plano_demanda (
  id                SERIAL      PRIMARY KEY,
  created_date      TIMESTAMPTZ NOT NULL,
  updated_date      TIMESTAMPTZ NOT NULL,
  is_deleted        BOOLEAN     NOT NULL,
  deleted_date      TIMESTAMPTZ,

  plano_id          INTEGER     NOT NULL,
  demanda_id        INTEGER     NOT NULL,
  publicacao_data   TIMESTAMPTZ,

  CONSTRAINT fk_plano_demanda_plano
    FOREIGN KEY (plano_id) REFERENCES plano(id),
  CONSTRAINT fk_plano_demanda_demanda
    FOREIGN KEY (demanda_id) REFERENCES demanda(id)
);
CREATE UNIQUE INDEX uix_plano_demanda_plano_demanda_ativo
  ON plano_demanda(plano_id, demanda_id) WHERE is_deleted = false;
CREATE INDEX ix_plano_demanda_demanda ON plano_demanda(demanda_id) WHERE is_deleted = false;
CREATE TRIGGER trg_plano_demanda_updated_date
  BEFORE UPDATE ON plano_demanda
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TRIGGER IF EXISTS trg_plano_demanda_updated_date ON plano_demanda;
DROP TABLE IF EXISTS plano_demanda CASCADE;
DROP TRIGGER IF EXISTS trg_plano_updated_date ON plano;
DROP TABLE IF EXISTS plano CASCADE;
