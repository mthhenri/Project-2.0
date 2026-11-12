-- UP

-- Mensagens fixadas de um grupo ou canal do chat entre colaboradores (task 250, guarda-chuva chat-grupos). A mensagem continua no armazenamento do chat; esta tabela
-- guarda só a referência (`mensagem_id`) e quem fixou. Fixar a mesma mensagem duas vezes não cria outra linha; desafixar é exclusão lógica. Quando a mensagem deixa de existir
-- no armazenamento (índice recriado), a listagem ignora a referência.
CREATE TABLE grupo_fixada (
  id                     SERIAL       PRIMARY KEY,
  created_date           TIMESTAMPTZ  NOT NULL,
  updated_date           TIMESTAMPTZ  NOT NULL,
  is_deleted             BOOLEAN      NOT NULL,
  deleted_date           TIMESTAMPTZ,

  grupo_id               INTEGER      NOT NULL,
  mensagem_id            UUID         NOT NULL,
  fixada_por_usuario_id  INTEGER      NOT NULL,

  CONSTRAINT fk_grupo_fixada_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  CONSTRAINT fk_grupo_fixada_usuario
    FOREIGN KEY (fixada_por_usuario_id) REFERENCES usuario(id)
);
CREATE UNIQUE INDEX uix_grupo_fixada_grupo_mensagem ON grupo_fixada(grupo_id, mensagem_id) WHERE is_deleted = false;

-- DOWN

DROP TABLE grupo_fixada;
