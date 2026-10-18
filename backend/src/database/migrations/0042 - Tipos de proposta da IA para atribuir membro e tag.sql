-- UP

-- A IA faz o que o usuário faz, sempre com confirmação: atribuir membros a uma demanda e tags a demandas e atividades passam a ser propostas (task 168).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ATRIBUIR_MEMBRO', 'Atribuir membro', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ATRIBUIR_TAG', 'Atribuir tags', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo IN ('ATRIBUIR_MEMBRO', 'ATRIBUIR_TAG') AND is_deleted = false;
