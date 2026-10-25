-- UP

-- Justificar o ponto de outra pessoa passa a ser proposta da IA, só do gestor e sempre com confirmação (task 231).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'JUSTIFICAR_PONTO', 'Justificar ponto', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo = 'JUSTIFICAR_PONTO' AND is_deleted = false;
