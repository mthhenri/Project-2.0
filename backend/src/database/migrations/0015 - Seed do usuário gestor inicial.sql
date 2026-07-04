-- UP

-- Idempotente: só insere se ainda não houver gestor inicial ativo com esse login.
-- senha_encriptada é um hash bcrypt (custo 10) da senha 'project2026'.
INSERT INTO usuario (
  login, senha_encriptada, nome_completo, cargo_titulo,
  tipo, horas_diarias_necessarias, status,
  created_date, updated_date, is_deleted
)
SELECT
  'gestor.inicial', '$2b$10$51f1N0cpsHPMmnogphlgQ.dnH5GAbLLTuMtcN0kD7EZZIWnewhb/K', 'Gestor Inicial', 'Gestor',
  'GESTOR', 8, 'ATIVO',
  NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM usuario
  WHERE usuario.login = 'gestor.inicial'
    AND usuario.is_deleted = false
);

-- DOWN

DELETE FROM usuario
WHERE usuario.login = 'gestor.inicial';
