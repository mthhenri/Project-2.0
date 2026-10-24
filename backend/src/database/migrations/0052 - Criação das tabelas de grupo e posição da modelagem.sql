-- UP

-- Grupos do diagrama da tela Modelagem: quem cria, renomeia e exclui é o gestor, pela própria tela. A cor do grupo é o índice
-- `cor_indice` (0 a 6) na paleta do diagrama; o 7 é reservado ao "Sem grupo" (tabelas que ainda não foram agrupadas).
CREATE TABLE modelagem_grupo (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  titulo     VARCHAR(150) NOT NULL,
  rotulo     VARCHAR(60)  NOT NULL,
  ordem      INTEGER      NOT NULL,
  cor_indice INTEGER      NOT NULL,

  CONSTRAINT chk_modelagem_grupo_cor_indice CHECK (cor_indice BETWEEN 0 AND 6)
);

CREATE UNIQUE INDEX uix_modelagem_grupo_rotulo_ativo
  ON modelagem_grupo (LOWER(rotulo))
  WHERE is_deleted = false;

CREATE TRIGGER trg_modelagem_grupo_updated_date
  BEFORE UPDATE ON modelagem_grupo
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Grupo e posição de cada tabela do banco no diagrama. `nome_tabela` é o nome no catálogo do PostgreSQL (não uma FK: a tabela
-- pode ser criada ou removida por migration); sem linha, a tabela aparece em posição automática e, se for `tipo_*`, no grupo de
-- quem a referencia. `modelagem_grupo_id` nulo = "Sem grupo".
CREATE TABLE modelagem_tabela (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  nome_tabela        VARCHAR(100) NOT NULL,
  modelagem_grupo_id INTEGER,
  posicao_x          INTEGER      NOT NULL,
  posicao_y          INTEGER      NOT NULL,

  CONSTRAINT fk_modelagem_tabela_modelagem_grupo
    FOREIGN KEY (modelagem_grupo_id) REFERENCES modelagem_grupo(id)
);

CREATE UNIQUE INDEX uix_modelagem_tabela_nome_tabela_ativa
  ON modelagem_tabela (nome_tabela)
  WHERE is_deleted = false;

CREATE INDEX ix_modelagem_tabela_modelagem_grupo
  ON modelagem_tabela (modelagem_grupo_id);

CREATE TRIGGER trg_modelagem_tabela_updated_date
  BEFORE UPDATE ON modelagem_tabela
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Semente: os grupos e as posições que a tela tinha até aqui (arquivo de configuração do backend, que sai com esta migration),
-- mais as duas tabelas novas, num grupo próprio.
INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
SELECT 'Domínio: projetos, demandas, atividades e execuções', 'Domínio', 1, 0, NOW(), NOW(), false;
INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
SELECT 'Usuários, ponto e anotações', 'Usuários e ponto', 2, 1, NOW(), NOW(), false;
INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
SELECT 'Calendário', 'Calendário', 3, 2, NOW(), NOW(), false;
INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
SELECT 'IA', 'IA', 4, 3, NOW(), NOW(), false;
INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
SELECT 'Chat (armazenamento provisório; sem FK para o domínio)', 'Chat (provisório)', 5, 4, NOW(), NOW(), false;
INSERT INTO modelagem_grupo (titulo, rotulo, ordem, cor_indice, created_date, updated_date, is_deleted)
SELECT 'Modelagem do banco: grupos e posições do diagrama', 'Modelagem', 6, 5, NOW(), NOW(), false;

INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'anotacao', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Usuários e ponto' AND modelagem_grupo.is_deleted = false), 1420, 600, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'atividade', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 800, 320, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'atividade_tag', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 800, 640, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'chat_conversa', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Chat (provisório)' AND modelagem_grupo.is_deleted = false), 800, 1000, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'chat_mensagem', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Chat (provisório)' AND modelagem_grupo.is_deleted = false), 800, 1170, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'configuracao_ia', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 1790, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'demanda', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 420, 320, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'demanda_conexao', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 40, 340, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'demanda_tag', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 420, 640, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'demanda_usuario', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 40, 540, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'dia_nao_util', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Calendário' AND modelagem_grupo.is_deleted = false), 40, 1000, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'execucao', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 800, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'mensagem_direta', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Chat (provisório)' AND modelagem_grupo.is_deleted = false), 1100, 1000, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'mensagem_direta_leitura', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Chat (provisório)' AND modelagem_grupo.is_deleted = false), 1400, 1000, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'mensagem_direta_preferencia', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Chat (provisório)' AND modelagem_grupo.is_deleted = false), 1400, 1180, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'mensagem_direta_supervisao', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Chat (provisório)' AND modelagem_grupo.is_deleted = false), 1790, 1000, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'modelagem_grupo', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Modelagem' AND modelagem_grupo.is_deleted = false), 40, 1330, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'modelagem_tabela', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Modelagem' AND modelagem_grupo.is_deleted = false), 400, 1330, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'ponto_justificativa', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Usuários e ponto' AND modelagem_grupo.is_deleted = false), 1420, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'projeto', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 420, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'prompt', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 1790, 430, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'proposta_ia', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 1790, 640, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tag', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 420, 800, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_anotacao', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Usuários e ponto' AND modelagem_grupo.is_deleted = false), 1420, 740, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_atividade_prioridade', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 1140, 550, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_atividade_status', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 1140, 420, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_demanda_status', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 40, 190, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_dia_nao_util', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Calendário' AND modelagem_grupo.is_deleted = false), 420, 1000, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_dia_nao_util_duracao', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Calendário' AND modelagem_grupo.is_deleted = false), 420, 1130, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_projeto_status', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Domínio' AND modelagem_grupo.is_deleted = false), 40, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_prompt', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 2170, 430, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_proposta_ia', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 2170, 640, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_proposta_ia_status', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 2170, 770, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_provedor_ia', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'IA' AND modelagem_grupo.is_deleted = false), 2170, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_usuario', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Usuários e ponto' AND modelagem_grupo.is_deleted = false), 1140, 60, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'tipo_usuario_status', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Usuários e ponto' AND modelagem_grupo.is_deleted = false), 1140, 190, NOW(), NOW(), false;
INSERT INTO modelagem_tabela (nome_tabela, modelagem_grupo_id, posicao_x, posicao_y, created_date, updated_date, is_deleted)
SELECT 'usuario', (SELECT modelagem_grupo.id FROM modelagem_grupo WHERE modelagem_grupo.rotulo = 'Usuários e ponto' AND modelagem_grupo.is_deleted = false), 1420, 320, NOW(), NOW(), false;

-- DOWN

DROP TRIGGER IF EXISTS trg_modelagem_tabela_updated_date ON modelagem_tabela;
DROP TABLE IF EXISTS modelagem_tabela CASCADE;
DROP TRIGGER IF EXISTS trg_modelagem_grupo_updated_date ON modelagem_grupo;
DROP TABLE IF EXISTS modelagem_grupo CASCADE;
