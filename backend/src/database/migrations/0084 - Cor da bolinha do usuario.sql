-- UP

-- Cor da bolinha (avatar) que a pessoa escolhe para si (task 316): hexadecimal #RRGGBB em maiúsculas. Anulável porque os usuários existentes não escolheram
-- (vale a cor de acento do tema); o padrão mora no frontend, nunca em DEFAULT. Não entra em WHERE, JOIN nem FK.
ALTER TABLE usuario
  ADD COLUMN cor_avatar VARCHAR(7);

-- DOWN

ALTER TABLE usuario
  DROP COLUMN cor_avatar;
