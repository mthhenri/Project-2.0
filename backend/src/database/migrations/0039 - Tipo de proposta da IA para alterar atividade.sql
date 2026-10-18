-- UP

-- A IA faz o que o usuário faz, sempre com confirmação: alterar status, prioridade e nome de uma atividade passa a ser uma proposta (task 165).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ALTERAR_ATIVIDADE', 'Alterar atividade', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo = 'ALTERAR_ATIVIDADE' AND is_deleted = false;
