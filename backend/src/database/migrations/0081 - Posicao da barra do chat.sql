-- UP

-- Onde a barra de conversas fica em relação à conversa aberta no chat entre colaboradores (task 318). Coluna simples (a posição não entra em WHERE, JOIN nem FK, como
-- `posicao_popup`): o código do enum PosicaoBarraChatEnum, anulável porque as linhas anteriores não têm valor. O padrão (ESQUERDA) mora no shared, nunca em DEFAULT.
ALTER TABLE mensagem_direta_preferencia
  ADD COLUMN posicao_barra VARCHAR(30);

-- DOWN

ALTER TABLE mensagem_direta_preferencia
  DROP COLUMN posicao_barra;
