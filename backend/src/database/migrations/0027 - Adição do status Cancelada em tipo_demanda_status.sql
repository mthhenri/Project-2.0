-- UP

INSERT INTO tipo_demanda_status (codigo, descricao, created_date, updated_date, is_deleted)
SELECT 'CANCELADA', 'Cancelada', NOW(), NOW(), false
RETURNING id;

-- DOWN

DELETE FROM tipo_demanda_status WHERE codigo = 'CANCELADA';
