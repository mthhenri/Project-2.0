-- UP

-- Grupos do chat entre colaboradores (task 246, guarda-chuva chat-grupos). A conversa um a um não muda: o grupo ganha tabelas próprias porque o conjunto de
-- membros muda e há nome, cor e emoji. As mensagens do grupo ficam no mesmo armazenamento das mensagens um a um (índice ou tabela provisória), com
-- `conversa_tipo = GRUPO` e `conversa_id = G<id do grupo>`. Esta migration só cria o que o grupo livre usa: `grupo_fixada` é da task 250 e `grupo_resumo`, da 249.

-- Tipos de grupo. `PROJETO` e `DEMANDA` são os canais (task 248); o grupo livre é `LIVRE`.
CREATE TABLE tipo_grupo (
  id            SERIAL       PRIMARY KEY,
  created_date  TIMESTAMPTZ  NOT NULL,
  updated_date  TIMESTAMPTZ  NOT NULL,
  is_deleted    BOOLEAN      NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_grupo_codigo ON tipo_grupo(codigo) WHERE is_deleted = false;

INSERT INTO tipo_grupo (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'LIVRE', 'Grupo livre', NOW(), NOW(), false;
INSERT INTO tipo_grupo (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PROJETO', 'Canal de projeto', NOW(), NOW(), false;
INSERT INTO tipo_grupo (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DEMANDA', 'Canal de demanda', NOW(), NOW(), false;

-- O grupo. `projeto_id` e `demanda_id` só valem nos canais (nulos no grupo livre); um canal por projeto e um por demanda. `cor_avatar` (`#RRGGBB`
-- em maiúsculas) e `emoji_avatar` (um emoji no lugar das iniciais) são escolhidos pelos membros e anuláveis: sem cor vale o degradê das cores dos
-- membros atuais e sem emoji valem as iniciais do nome. O padrão mora no frontend, nunca em DEFAULT.
CREATE TABLE grupo (
  id                  SERIAL       PRIMARY KEY,
  created_date        TIMESTAMPTZ  NOT NULL,
  updated_date        TIMESTAMPTZ  NOT NULL,
  is_deleted          BOOLEAN      NOT NULL,
  deleted_date        TIMESTAMPTZ,

  nome                VARCHAR(60)  NOT NULL,
  tipo_grupo_id       INTEGER      NOT NULL,
  criador_usuario_id  INTEGER      NOT NULL,
  projeto_id          INTEGER,
  demanda_id          INTEGER,
  cor_avatar          VARCHAR(7),
  emoji_avatar        VARCHAR(16),

  CONSTRAINT fk_grupo_tipo_grupo
    FOREIGN KEY (tipo_grupo_id) REFERENCES tipo_grupo(id),
  CONSTRAINT fk_grupo_criador_usuario
    FOREIGN KEY (criador_usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_grupo_projeto
    FOREIGN KEY (projeto_id) REFERENCES projeto(id),
  CONSTRAINT fk_grupo_demanda
    FOREIGN KEY (demanda_id) REFERENCES demanda(id)
);
CREATE INDEX ix_grupo_tipo_grupo ON grupo(tipo_grupo_id) WHERE is_deleted = false;
CREATE UNIQUE INDEX uix_grupo_demanda ON grupo(demanda_id) WHERE is_deleted = false AND demanda_id IS NOT NULL;
CREATE UNIQUE INDEX uix_grupo_projeto ON grupo(projeto_id) WHERE is_deleted = false AND projeto_id IS NOT NULL AND demanda_id IS NULL;

-- Os membros do grupo livre. Nos canais os membros vêm de `demanda_usuario` e não há linha aqui. Sair preenche `saida_data`; ser readicionado reabre a
-- mesma linha (`saida_data` nula e `entrada_data` nova), então há uma linha por pessoa e grupo. `entrada_data` é também o ponto de partida das não lidas.
CREATE TABLE grupo_membro (
  id            SERIAL       PRIMARY KEY,
  created_date  TIMESTAMPTZ  NOT NULL,
  updated_date  TIMESTAMPTZ  NOT NULL,
  is_deleted    BOOLEAN      NOT NULL,
  deleted_date  TIMESTAMPTZ,

  grupo_id      INTEGER      NOT NULL,
  usuario_id    INTEGER      NOT NULL,
  entrada_data  TIMESTAMPTZ  NOT NULL,
  saida_data    TIMESTAMPTZ,

  CONSTRAINT fk_grupo_membro_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  CONSTRAINT fk_grupo_membro_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT chk_grupo_membro_periodo
    CHECK (saida_data IS NULL OR saida_data >= entrada_data)
);
CREATE UNIQUE INDEX uix_grupo_membro_grupo_usuario ON grupo_membro(grupo_id, usuario_id) WHERE is_deleted = false;
CREATE INDEX ix_grupo_membro_usuario ON grupo_membro(usuario_id) WHERE is_deleted = false AND saida_data IS NULL;

-- Até onde cada membro leu o grupo e se silenciou os avisos dele. Uma linha por pessoa e grupo, criada na primeira leitura ou no primeiro silêncio.
-- `lida_ate_data` é o `created_date` da última mensagem que a pessoa viu (como em `mensagem_direta_leitura`); sem linha, as não lidas contam desde `entrada_data`.
CREATE TABLE grupo_leitura (
  id             SERIAL       PRIMARY KEY,
  created_date   TIMESTAMPTZ  NOT NULL,
  updated_date   TIMESTAMPTZ  NOT NULL,
  is_deleted     BOOLEAN      NOT NULL,
  deleted_date   TIMESTAMPTZ,

  grupo_id       INTEGER      NOT NULL,
  usuario_id     INTEGER      NOT NULL,
  lida_ate_data  TIMESTAMPTZ,
  silenciada     BOOLEAN      NOT NULL,

  CONSTRAINT fk_grupo_leitura_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  CONSTRAINT fk_grupo_leitura_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
CREATE UNIQUE INDEX uix_grupo_leitura_grupo_usuario ON grupo_leitura(grupo_id, usuario_id) WHERE is_deleted = false;
CREATE INDEX ix_grupo_leitura_usuario ON grupo_leitura(usuario_id) WHERE is_deleted = false;

-- A mensagem do grupo na tabela provisória (0051). Os dois participantes passam a ser anuláveis (nulos no grupo) e a linha ganha o tipo da conversa e o
-- grupo. O valor entra só para preencher as mensagens existentes (todas um a um) e sai em seguida: nenhuma coluna tem DEFAULT. Os dois CHECKs antigos
-- viram um só, que amarra `conversa_id` ao par (um a um) ou ao grupo (`G<id>`).
ALTER TABLE mensagem_direta
  DROP CONSTRAINT chk_mensagem_direta_pessoas,
  DROP CONSTRAINT chk_mensagem_direta_conversa;
ALTER TABLE mensagem_direta
  ALTER COLUMN usuario_menor_id DROP NOT NULL,
  ALTER COLUMN usuario_maior_id DROP NOT NULL,
  ADD COLUMN conversa_tipo VARCHAR(10) NOT NULL DEFAULT 'DIRETA',
  ADD COLUMN grupo_id INTEGER;
ALTER TABLE mensagem_direta
  ALTER COLUMN conversa_tipo DROP DEFAULT;
ALTER TABLE mensagem_direta
  ADD CONSTRAINT chk_mensagem_direta_conversa
    CHECK (
      (
        conversa_tipo = 'DIRETA'
        AND grupo_id IS NULL
        AND usuario_menor_id IS NOT NULL
        AND usuario_maior_id IS NOT NULL
        AND usuario_menor_id < usuario_maior_id
        AND conversa_id = usuario_menor_id::text || '-' || usuario_maior_id::text
      )
      OR (
        conversa_tipo = 'GRUPO'
        AND grupo_id IS NOT NULL
        AND usuario_menor_id IS NULL
        AND usuario_maior_id IS NULL
        AND conversa_id = 'G' || grupo_id::text
      )
    );
CREATE INDEX ix_mensagem_direta_grupo ON mensagem_direta(grupo_id) WHERE is_deleted = false AND grupo_id IS NOT NULL;

-- A auditoria da supervisão ganha o grupo: a abertura de um grupo guarda `grupo_id` e deixa os dois participantes nulos. Mesma ideia do CHECK acima.
ALTER TABLE mensagem_direta_supervisao
  DROP CONSTRAINT chk_mensagem_direta_supervisao_ordem,
  DROP CONSTRAINT chk_mensagem_direta_supervisao_conversa;
ALTER TABLE mensagem_direta_supervisao
  ALTER COLUMN usuario_menor_id DROP NOT NULL,
  ALTER COLUMN usuario_maior_id DROP NOT NULL,
  ADD COLUMN grupo_id INTEGER;
ALTER TABLE mensagem_direta_supervisao
  ADD CONSTRAINT fk_mensagem_direta_supervisao_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  ADD CONSTRAINT chk_mensagem_direta_supervisao_conversa
    CHECK (
      (
        grupo_id IS NULL
        AND usuario_menor_id IS NOT NULL
        AND usuario_maior_id IS NOT NULL
        AND usuario_menor_id < usuario_maior_id
        AND conversa_id = usuario_menor_id::text || '-' || usuario_maior_id::text
      )
      OR (
        grupo_id IS NOT NULL
        AND usuario_menor_id IS NULL
        AND usuario_maior_id IS NULL
        AND conversa_id = 'G' || grupo_id::text
      )
    );

-- DOWN

-- O grupo não existe antes desta migration: as linhas de grupo saem para a restrição de participantes poder voltar.
DELETE FROM mensagem_direta_supervisao WHERE grupo_id IS NOT NULL;
ALTER TABLE mensagem_direta_supervisao
  DROP CONSTRAINT chk_mensagem_direta_supervisao_conversa,
  DROP CONSTRAINT fk_mensagem_direta_supervisao_grupo,
  DROP COLUMN grupo_id,
  ALTER COLUMN usuario_menor_id SET NOT NULL,
  ALTER COLUMN usuario_maior_id SET NOT NULL;
ALTER TABLE mensagem_direta_supervisao
  ADD CONSTRAINT chk_mensagem_direta_supervisao_ordem
    CHECK (usuario_menor_id < usuario_maior_id),
  ADD CONSTRAINT chk_mensagem_direta_supervisao_conversa
    CHECK (conversa_id = usuario_menor_id::text || '-' || usuario_maior_id::text);

DROP INDEX ix_mensagem_direta_grupo;
DELETE FROM mensagem_direta WHERE conversa_tipo = 'GRUPO';
ALTER TABLE mensagem_direta
  DROP CONSTRAINT chk_mensagem_direta_conversa,
  DROP COLUMN grupo_id,
  DROP COLUMN conversa_tipo,
  ALTER COLUMN usuario_menor_id SET NOT NULL,
  ALTER COLUMN usuario_maior_id SET NOT NULL;
ALTER TABLE mensagem_direta
  ADD CONSTRAINT chk_mensagem_direta_pessoas
    CHECK (usuario_menor_id < usuario_maior_id),
  ADD CONSTRAINT chk_mensagem_direta_conversa
    CHECK (conversa_id = usuario_menor_id::text || '-' || usuario_maior_id::text);

DROP TABLE grupo_leitura;
DROP TABLE grupo_membro;
DROP TABLE grupo;
DROP TABLE tipo_grupo;
