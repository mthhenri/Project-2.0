-- UP

-- Resumo de um grupo ou canal do chat feito pela IA (task 249, guarda-chuva chat-grupos). Uma linha por resumo gerado: quem pediu, o período, se o código foi enviado ao
-- provedor, o modelo e os tokens (de onde sai o "último resumo" do grupo). O texto do resumo **não** é guardado aqui: ele volta à tela e só vira texto da demanda se a pessoa
-- confirmar a proposta de gravar (`proposta_ia_id`, `demanda_id` e `gravada_data`). Os custos entram na aba Custos pela mensagem de uso do chat (`IaUsoService`), não por esta
-- tabela, para nenhuma chamada contar duas vezes.
CREATE TABLE grupo_resumo (
  id                   SERIAL       PRIMARY KEY,
  created_date         TIMESTAMPTZ  NOT NULL,
  updated_date         TIMESTAMPTZ  NOT NULL,
  is_deleted           BOOLEAN      NOT NULL,
  deleted_date         TIMESTAMPTZ,

  grupo_id             INTEGER      NOT NULL,
  usuario_id           INTEGER      NOT NULL,
  inicio_data          TIMESTAMPTZ  NOT NULL,
  fim_data             TIMESTAMPTZ  NOT NULL,
  enviou_codigo        BOOLEAN      NOT NULL,
  quantidade_mensagens INTEGER      NOT NULL,
  modelo               VARCHAR(120) NOT NULL,
  tokens_entrada       INTEGER      NOT NULL,
  tokens_saida         INTEGER      NOT NULL,
  proposta_ia_id       INTEGER,
  demanda_id           INTEGER,
  gravada_data         TIMESTAMPTZ,

  CONSTRAINT fk_grupo_resumo_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  CONSTRAINT fk_grupo_resumo_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuario(id),
  CONSTRAINT fk_grupo_resumo_proposta_ia
    FOREIGN KEY (proposta_ia_id) REFERENCES proposta_ia(id),
  CONSTRAINT fk_grupo_resumo_demanda
    FOREIGN KEY (demanda_id) REFERENCES demanda(id),
  CONSTRAINT chk_grupo_resumo_periodo
    CHECK (fim_data >= inicio_data)
);
CREATE INDEX ix_grupo_resumo_grupo ON grupo_resumo(grupo_id, fim_data) WHERE is_deleted = false;

-- DOWN

DROP TABLE grupo_resumo;
