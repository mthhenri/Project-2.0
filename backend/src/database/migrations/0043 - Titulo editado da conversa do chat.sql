-- UP

-- O usuário passa a poder renomear a conversa (task 192): o nome editado à mão nunca é sobrescrito pela renomeação automática da IA.
-- Nenhuma coluna tem DEFAULT: o valor entra só para preencher as linhas existentes (nome da IA, não editado) e o default sai em seguida.
ALTER TABLE chat_conversa ADD COLUMN titulo_editado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE chat_conversa ALTER COLUMN titulo_editado DROP DEFAULT;

-- DOWN

ALTER TABLE chat_conversa DROP COLUMN titulo_editado;
