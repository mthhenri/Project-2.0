-- UP

-- Chat entre colaboradores (task 205). As mensagens NÃO ficam aqui: são gravadas uma vez e nunca reescritas, num índice (OpenSearch no
-- desenvolvimento, Elasticsearch na produção final) ou, na produção de teste, numa tabela provisória (task 207). Estas três tabelas guardam
-- o estado que muda: até onde cada pessoa leu, as preferências e o registro da leitura pelo gestor. Ver docs/SCHEMA.md.
--
-- `conversa_id` é `<menorUsuarioId>-<maiorUsuarioId>` (ex.: `4-9`): o par sempre cai na mesma conversa, e por isso não existe tabela de conversa.
-- Cada CHECK de `conversa_id` garante que o texto bate com os dois ids da própria linha.

-- Até onde cada pessoa leu cada conversa, e se silenciou os avisos dela. Uma linha por pessoa e conversa, criada na primeira leitura ou na primeira
-- vez que a conversa é silenciada. `lida_ate_date` é o `created_date` da última mensagem que a pessoa viu (não o instante da leitura): uma mensagem
-- que chega entre a busca e a marcação nunca é dada como lida sem ter sido vista. Dela saem as não lidas e o "Lida" da outra ponta.
CREATE TABLE mensagem_direta_leitura (
  id                SERIAL      PRIMARY KEY,
  created_date      TIMESTAMPTZ NOT NULL,
  updated_date      TIMESTAMPTZ NOT NULL,
  is_deleted        BOOLEAN     NOT NULL,
  deleted_date      TIMESTAMPTZ,

  conversa_id       VARCHAR(21) NOT NULL,
  usuario_id        INTEGER     NOT NULL,
  outro_usuario_id  INTEGER     NOT NULL,
  lida_ate_date     TIMESTAMPTZ,
  silenciada        BOOLEAN     NOT NULL,

  CONSTRAINT fk_mensagem_direta_leitura_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_mensagem_direta_leitura_outro_usuario
    FOREIGN KEY (outro_usuario_id) REFERENCES usuario(id),
  CONSTRAINT chk_mensagem_direta_leitura_pessoas
    CHECK (usuario_id <> outro_usuario_id),
  CONSTRAINT chk_mensagem_direta_leitura_conversa
    CHECK (conversa_id = LEAST(usuario_id, outro_usuario_id)::text || '-' || GREATEST(usuario_id, outro_usuario_id)::text)
);
CREATE UNIQUE INDEX uix_mensagem_direta_leitura_conversa_usuario
  ON mensagem_direta_leitura(conversa_id, usuario_id) WHERE is_deleted = false;
CREATE INDEX ix_mensagem_direta_leitura_usuario
  ON mensagem_direta_leitura(usuario_id) WHERE is_deleted = false;
CREATE TRIGGER trg_mensagem_direta_leitura_updated_date
  BEFORE UPDATE ON mensagem_direta_leitura
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- As preferências do chat, uma linha por usuário, criada na primeira alteração. Sem linha, a service devolve o padrão que mora no `shared`
-- (nunca um DEFAULT de coluna). `silenciado_ate_date` é o instante em que o "silenciar por 1 hora" acaba: quem decide se um aviso aparece é a
-- service, comparando com a hora atual, então não há tarefa agendada para reativar. `atalho_global` é o atalho do Project Desktop no formato
-- do Electron e fica aqui para seguir a pessoa entre computadores.
CREATE TABLE mensagem_direta_preferencia (
  id                   SERIAL      PRIMARY KEY,
  created_date         TIMESTAMPTZ NOT NULL,
  updated_date         TIMESTAMPTZ NOT NULL,
  is_deleted           BOOLEAN     NOT NULL,
  deleted_date         TIMESTAMPTZ,

  usuario_id           INTEGER     NOT NULL,
  avisos_ativos        BOOLEAN     NOT NULL,
  aviso_desktop_ativo  BOOLEAN     NOT NULL,
  som_ativo            BOOLEAN     NOT NULL,
  silenciado_ate_date  TIMESTAMPTZ,
  atalho_global        VARCHAR(40) NOT NULL,

  CONSTRAINT fk_mensagem_direta_preferencia_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);
CREATE UNIQUE INDEX uix_mensagem_direta_preferencia_usuario
  ON mensagem_direta_preferencia(usuario_id) WHERE is_deleted = false;
CREATE TRIGGER trg_mensagem_direta_preferencia_updated_date
  BEFORE UPDATE ON mensagem_direta_preferencia
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Cada abertura, por um gestor ou administrador, de uma conversa que não é dele (auditoria da supervisão). Só conversas entre desenvolvedores
-- podem ser abertas; quem confere é a service, pelo tipo atual dos dois usuários. Os dois participantes ficam em colunas próprias para consultar
-- e avisar sem interpretar o `conversa_id`. `participantes_avisados` diz se esta abertura gerou o aviso na conversa: ele sai uma vez por leitor,
-- conversa e dia, para não inundá-la. `created_date` é o instante da abertura.
CREATE TABLE mensagem_direta_supervisao (
  id                      SERIAL      PRIMARY KEY,
  created_date            TIMESTAMPTZ NOT NULL,
  updated_date            TIMESTAMPTZ NOT NULL,
  is_deleted              BOOLEAN     NOT NULL,
  deleted_date            TIMESTAMPTZ,

  leitor_usuario_id       INTEGER     NOT NULL,
  conversa_id             VARCHAR(21) NOT NULL,
  usuario_menor_id        INTEGER     NOT NULL,
  usuario_maior_id        INTEGER     NOT NULL,
  participantes_avisados  BOOLEAN     NOT NULL,

  CONSTRAINT fk_mensagem_direta_supervisao_leitor_usuario
    FOREIGN KEY (leitor_usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_mensagem_direta_supervisao_usuario_menor
    FOREIGN KEY (usuario_menor_id) REFERENCES usuario(id),
  CONSTRAINT fk_mensagem_direta_supervisao_usuario_maior
    FOREIGN KEY (usuario_maior_id) REFERENCES usuario(id),
  CONSTRAINT chk_mensagem_direta_supervisao_ordem
    CHECK (usuario_menor_id < usuario_maior_id),
  CONSTRAINT chk_mensagem_direta_supervisao_conversa
    CHECK (conversa_id = usuario_menor_id::text || '-' || usuario_maior_id::text)
);
CREATE INDEX ix_mensagem_direta_supervisao_leitor_conversa
  ON mensagem_direta_supervisao(leitor_usuario_id, conversa_id, created_date) WHERE is_deleted = false;
CREATE TRIGGER trg_mensagem_direta_supervisao_updated_date
  BEFORE UPDATE ON mensagem_direta_supervisao
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- DOWN

DROP TABLE mensagem_direta_supervisao;
DROP TABLE mensagem_direta_preferencia;
DROP TABLE mensagem_direta_leitura;
