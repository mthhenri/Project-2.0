-- UP

-- Editar a mensagem do chat entre colaboradores (task 313): quando o autor a editou pela última vez; nulo = nunca editada. O texto original NÃO é guardado
-- (I-052). Tabela provisória (0051), então a coluna sai junto com ela. Sem DEFAULT: a aplicação grava o valor.
ALTER TABLE mensagem_direta
  ADD COLUMN editada_date TIMESTAMPTZ;

-- DOWN

ALTER TABLE mensagem_direta
  DROP COLUMN editada_date;
