-- UP

-- Task 126: o texto que cada pessoa tinha em `usuario.anotacoes` (Markdown desde a task 124) vira a seção PESSOAL.
-- Só preenche seção vazia e só quando o texto tem algo além de espaços. A coluna antiga fica como cópia até a task 128.
UPDATE anotacao
SET texto = usuario.anotacoes
FROM usuario, tipo_anotacao
WHERE usuario.id = anotacao.usuario_id
  AND tipo_anotacao.id = anotacao.tipo_anotacao_id
  AND tipo_anotacao.codigo = 'PESSOAL'
  AND anotacao.is_deleted = false
  AND anotacao.texto = ''
  AND usuario.anotacoes IS NOT NULL
  AND btrim(usuario.anotacoes, E' \t\r\n') <> '';

-- DOWN

-- Esvazia a seção PESSOAL apenas onde ela ainda é idêntica à coluna antiga (o que a migration copiou); o que a
-- pessoa editou depois fica.
UPDATE anotacao
SET texto = ''
FROM usuario, tipo_anotacao
WHERE usuario.id = anotacao.usuario_id
  AND tipo_anotacao.id = anotacao.tipo_anotacao_id
  AND tipo_anotacao.codigo = 'PESSOAL'
  AND anotacao.is_deleted = false
  AND anotacao.texto = usuario.anotacoes;
