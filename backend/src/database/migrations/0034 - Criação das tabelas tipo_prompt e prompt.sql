-- UP

-- Tipos de prompt da IA (task 131). A lista cresce por migration, não pela tela.
CREATE TABLE tipo_prompt (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  codigo        VARCHAR(40)  NOT NULL,
  descricao     VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX uix_tipo_prompt_codigo ON tipo_prompt(codigo) WHERE is_deleted = false;
CREATE TRIGGER trg_tipo_prompt_updated_date
  BEFORE UPDATE ON tipo_prompt
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONVERSA', 'Conversa do dia', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CHECKIN', 'Check-in periódico', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESCRICAO_EXECUCAO', 'Descrição de execução', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PAD', 'Pad do usuário', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'PRIORIDADE', 'Prioridade de atividades', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ENTREVISTA_DEMANDA', 'Entrevista de demanda', NOW(), NOW(), false RETURNING id;
INSERT INTO tipo_prompt (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONEXAO_DEMANDA', 'Conexões entre demandas', NOW(), NOW(), false RETURNING id;

-- Prompts versionados. A versão é rascunho (`rascunho`), ativa (`ativo`) ou antiga (as duas falsas: o histórico).
-- Uma só ativa e um só rascunho por tipo é regra da service, dentro de transação (sem índice único, por decisão do autor).
CREATE TABLE prompt (
  id            SERIAL      PRIMARY KEY,
  created_date  TIMESTAMPTZ NOT NULL,
  updated_date  TIMESTAMPTZ NOT NULL,
  is_deleted    BOOLEAN     NOT NULL,
  deleted_date  TIMESTAMPTZ,

  tipo_prompt_id  INTEGER NOT NULL,
  versao          INTEGER NOT NULL,
  conteudo        TEXT    NOT NULL,
  ativo           BOOLEAN NOT NULL,
  rascunho        BOOLEAN NOT NULL,
  usuario_id      INTEGER NOT NULL,

  CONSTRAINT fk_prompt_tipo_prompt
    FOREIGN KEY (tipo_prompt_id) REFERENCES tipo_prompt(id),
  CONSTRAINT fk_prompt_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id)
);

CREATE UNIQUE INDEX uix_prompt_tipo_versao
  ON prompt(tipo_prompt_id, versao)
  WHERE is_deleted = false;

CREATE TRIGGER trg_prompt_updated_date
  BEFORE UPDATE ON prompt
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();

-- Versão 1 de cada tipo, ativa, autoria do administrador inicial: é o "padrão". Texto-base curto; as tasks que adotam cada
-- prompt (blocos 5 a 9) o refinam, e o administrador pode editar desde já.
INSERT INTO prompt (tipo_prompt_id, versao, conteudo, ativo, rascunho, usuario_id, created_date, updated_date, is_deleted)
SELECT tipo_prompt.id, 1,
       CASE tipo_prompt.codigo
         WHEN 'CONVERSA' THEN 'Você é o assistente do dia a dia de um desenvolvedor. Converse em português, de forma direta e objetiva, ajude a planejar e registrar o trabalho e sempre peça confirmação antes de qualquer ação que grave dados.'
         WHEN 'CHECKIN' THEN 'Pergunte ao desenvolvedor o que foi feito desde o último check-in e devolva uma descrição formal do trabalho, em terceira pessoa, sem gírias, pronta para ser registrada na execução.'
         WHEN 'DESCRICAO_EXECUCAO' THEN 'Escreva a descrição formal de uma execução a partir do relato do desenvolvedor: terceira pessoa, sem gírias, objetiva e fiel ao que foi dito. Descreva só trabalho.'
         WHEN 'PAD' THEN 'Mantenha o pad do desenvolvedor em Markdown, editando só o trecho necessário dentro da seção certa. Nunca reescreva a seção inteira, nunca reorganize nem remova texto por conta própria.'
         WHEN 'PRIORIDADE' THEN 'Defina a prioridade de uma atividade (urgente, alta, média, baixa ou indefinida) a partir da descrição, dos prazos e do contexto da demanda, e explique o motivo em uma frase.'
         WHEN 'ENTREVISTA_DEMANDA' THEN 'Entreviste o gestor para entender o que o cliente pediu e o que será feito, e proponha a descrição do cliente e a descrição técnica da demanda em Markdown.'
         WHEN 'CONEXAO_DEMANDA' THEN 'Com o contexto do projeto, sugira conexões da demanda com outras demandas ou um lugar melhor na árvore. Sempre pergunte antes de propor a mudança.'
       END,
       true, false, usuario.id, NOW(), NOW(), false
FROM tipo_prompt
CROSS JOIN usuario
WHERE tipo_prompt.is_deleted = false
  AND usuario.login = 'gestor.inicial';

-- DOWN

DROP TRIGGER IF EXISTS trg_prompt_updated_date ON prompt;
DROP TABLE IF EXISTS prompt CASCADE;
DROP TRIGGER IF EXISTS trg_tipo_prompt_updated_date ON tipo_prompt;
DROP TABLE IF EXISTS tipo_prompt CASCADE;
