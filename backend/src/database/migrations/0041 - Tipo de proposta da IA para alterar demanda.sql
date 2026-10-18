-- UP

-- A IA faz o que o usuário faz, sempre com confirmação: alterar nome, status, horas e previsão de uma demanda passa a ser uma proposta (task 167).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'ALTERAR_DEMANDA', 'Alterar demanda', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo = 'ALTERAR_DEMANDA' AND is_deleted = false;
