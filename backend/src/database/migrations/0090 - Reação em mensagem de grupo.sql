-- UP

-- Reação nas mensagens do grupo (task 326). A reação passa a ter dono: a conversa um a um (`conversa_id`, `<menorId>-<maiorId>`) ou o grupo (`grupo_id`),
-- nunca os dois e nunca nenhum. O índice único (`mensagem_id`, `usuario_id`) não muda: a mensagem já identifica a conversa. Sem DEFAULT e sem trigger.
ALTER TABLE mensagem_direta_reacao
  ADD COLUMN grupo_id INTEGER,
  ALTER COLUMN conversa_id DROP NOT NULL,
  ADD CONSTRAINT fk_mensagem_direta_reacao_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupo(id),
  ADD CONSTRAINT chk_mensagem_direta_reacao_dono
    CHECK ((conversa_id IS NOT NULL AND grupo_id IS NULL) OR (conversa_id IS NULL AND grupo_id IS NOT NULL));
CREATE INDEX ix_mensagem_direta_reacao_grupo
  ON mensagem_direta_reacao(grupo_id) WHERE is_deleted = false AND grupo_id IS NOT NULL;

-- DOWN

DROP INDEX ix_mensagem_direta_reacao_grupo;
DELETE FROM mensagem_direta_reacao WHERE grupo_id IS NOT NULL;
ALTER TABLE mensagem_direta_reacao
  DROP CONSTRAINT chk_mensagem_direta_reacao_dono,
  DROP CONSTRAINT fk_mensagem_direta_reacao_grupo,
  DROP COLUMN grupo_id,
  ALTER COLUMN conversa_id SET NOT NULL;
