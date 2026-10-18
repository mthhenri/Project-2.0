-- UP

-- A IA faz o que o usuário faz, sempre com confirmação: criar projeto passa a ser uma proposta (task 159).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CRIAR_PROJETO', 'Criar projeto', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo = 'CRIAR_PROJETO' AND is_deleted = false;
