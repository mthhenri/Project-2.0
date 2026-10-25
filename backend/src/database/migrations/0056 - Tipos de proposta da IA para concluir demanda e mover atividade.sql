-- UP

-- Concluir uma demanda e mover uma atividade para outra demanda passam a ser propostas da IA, sempre com confirmação (task 229).
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CONCLUIR_DEMANDA', 'Concluir demanda', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'MOVER_ATIVIDADE', 'Mover atividade', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo IN ('CONCLUIR_DEMANDA', 'MOVER_ATIVIDADE') AND is_deleted = false;
