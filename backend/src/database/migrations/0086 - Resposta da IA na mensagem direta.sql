-- UP

-- `@IA` no chat entre colaboradores (task 315): a resposta da IA é uma mensagem de autor `IA`, que guarda quem a chamou e as propostas do turno. Nas
-- outras mensagens as duas ficam nulas (nulo em `proposta_ids` é lido como vazio). Tabela provisória (0051), então as colunas saem junto com ela. Sem
-- DEFAULT: a aplicação grava os valores.
ALTER TABLE mensagem_direta
  ADD COLUMN chamada_por_usuario_id INTEGER,
  ADD COLUMN proposta_ids INTEGER[];

-- DOWN

ALTER TABLE mensagem_direta
  DROP COLUMN proposta_ids,
  DROP COLUMN chamada_por_usuario_id;
