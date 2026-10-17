-- UP

INSERT INTO tipo_usuario (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ADMINISTRADOR', 'Administrador', NOW(), NOW(), false
RETURNING id;

-- O gestor inicial (seed da 0015) passa a ser o administrador inicial.
UPDATE usuario
SET tipo_usuario_id = (
  SELECT tipo_usuario.id FROM tipo_usuario
  WHERE tipo_usuario.codigo = 'ADMINISTRADOR' AND tipo_usuario.is_deleted = false
)
WHERE usuario.login = 'gestor.inicial'
  AND usuario.is_deleted = false;

-- DOWN

-- Todo administrador volta a ser gestor antes de o tipo sair (a FK impede o DELETE com usuários nele).
UPDATE usuario
SET tipo_usuario_id = (
  SELECT tipo_usuario.id FROM tipo_usuario
  WHERE tipo_usuario.codigo = 'GESTOR' AND tipo_usuario.is_deleted = false
)
WHERE usuario.tipo_usuario_id = (
  SELECT tipo_usuario.id FROM tipo_usuario
  WHERE tipo_usuario.codigo = 'ADMINISTRADOR' AND tipo_usuario.is_deleted = false
);

DELETE FROM tipo_usuario WHERE codigo = 'ADMINISTRADOR';
