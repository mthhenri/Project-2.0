-- UP

INSERT INTO tipo_usuario (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'AUXILIAR', 'Auxiliar', NOW(), NOW(), false
RETURNING id;

-- DOWN

-- Todo auxiliar volta a ser desenvolvedor antes de o tipo sair (a FK impede o DELETE com usuários nele).
UPDATE usuario
SET tipo_usuario_id = (
  SELECT tipo_usuario.id FROM tipo_usuario
  WHERE tipo_usuario.codigo = 'DESENVOLVEDOR' AND tipo_usuario.is_deleted = false
)
WHERE usuario.tipo_usuario_id = (
  SELECT tipo_usuario.id FROM tipo_usuario
  WHERE tipo_usuario.codigo = 'AUXILIAR' AND tipo_usuario.is_deleted = false
);

DELETE FROM tipo_usuario WHERE codigo = 'AUXILIAR';
