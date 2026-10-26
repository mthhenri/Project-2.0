-- UP

-- Onde o popup do chat entre colaboradores abre na tela (task 221). Coluna simples (a posição não entra em WHERE, JOIN nem FK, como `atalho_global`): o código do
-- enum PosicaoPopupChatEnum, anulável porque as linhas anteriores não têm valor. O padrão (CANTO_INFERIOR_DIREITO) mora no shared, nunca em DEFAULT.
ALTER TABLE mensagem_direta_preferencia
  ADD COLUMN posicao_popup VARCHAR(30);

-- DOWN

ALTER TABLE mensagem_direta_preferencia
  DROP COLUMN posicao_popup;
