-- UP

-- PROVISÓRIO como a tabela (task 207): a mensagem que responde a outra (task 220). Os três campos espelham `responde_a_*` do documento do índice e vêm
-- juntos ou não vêm. O trecho é uma cópia do começo do texto original, gravada no envio; a mensagem continua imutável. Sem FK, como o resto da tabela:
-- quem garante que a respondida é desta conversa é a service.
ALTER TABLE mensagem_direta
  ADD COLUMN responde_a_mensagem_id       UUID,
  ADD COLUMN responde_a_autor_usuario_id  INTEGER,
  ADD COLUMN responde_a_trecho            TEXT,
  ADD CONSTRAINT chk_mensagem_direta_resposta
    CHECK (
      (responde_a_mensagem_id IS NULL AND responde_a_autor_usuario_id IS NULL AND responde_a_trecho IS NULL)
      OR (responde_a_mensagem_id IS NOT NULL AND responde_a_autor_usuario_id IS NOT NULL AND responde_a_trecho IS NOT NULL)
    );

-- DOWN

ALTER TABLE mensagem_direta
  DROP CONSTRAINT chk_mensagem_direta_resposta,
  DROP COLUMN responde_a_trecho,
  DROP COLUMN responde_a_autor_usuario_id,
  DROP COLUMN responde_a_mensagem_id;
