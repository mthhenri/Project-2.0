-- UP

-- Desconectar duas demandas e excluir uma atividade sem execução passam a ser propostas da IA (task 230), as duas únicas exclusões que ela pode propor.
INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'DESCONECTAR_DEMANDA', 'Desconectar demandas', NOW(), NOW(), false RETURNING id;

INSERT INTO tipo_proposta_ia (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'EXCLUIR_ATIVIDADE', 'Excluir atividade sem execução', NOW(), NOW(), false RETURNING id;

-- DOWN

UPDATE tipo_proposta_ia SET is_deleted = true, deleted_date = NOW() WHERE codigo IN ('DESCONECTAR_DEMANDA', 'EXCLUIR_ATIVIDADE') AND is_deleted = false;
