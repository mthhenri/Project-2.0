-- UP

-- A IA faz o que o usuário faz, sempre com confirmação: registrar uma execução passada (gestor) e corrigir uma existente passam a ser propostas (task 166).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'REGISTRAR_EXECUCAO', 'Registrar execução', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CORRIGIR_EXECUCAO', 'Corrigir execução', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo IN ('REGISTRAR_EXECUCAO', 'CORRIGIR_EXECUCAO') AND is_deleted = false;
