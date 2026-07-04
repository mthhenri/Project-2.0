-- UP

-- Idempotente: cada tag só é inserida se ainda não houver uma ativa com o mesmo nome.

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Backend', '#3b82f6', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Backend' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Frontend', '#8b5cf6', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Frontend' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Bug', '#ef4444', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Bug' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Feature', '#22c55e', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Feature' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Refatoração', '#f59e0b', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Refatoração' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Documentação', '#0ea5e9', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Documentação' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Teste', '#ec4899', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Teste' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Banco de Dados', '#6366f1', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Banco de Dados' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'API', '#06b6d4', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'API' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Infraestrutura', '#64748b', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Infraestrutura' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'DevOps', '#14b8a6', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'DevOps' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Segurança', '#dc2626', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Segurança' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Performance', '#f97316', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Performance' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'UI/UX', '#a855f7', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'UI/UX' AND tag.is_deleted = false);

-- DOWN

-- Remove apenas as tags ATIVAS semeadas; preserva soft-deletadas homônimas pré-existentes.
DELETE FROM tag WHERE tag.nome = 'Backend' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Frontend' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Bug' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Feature' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Refatoração' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Documentação' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Teste' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Banco de Dados' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'API' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Infraestrutura' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'DevOps' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Segurança' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Performance' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'UI/UX' AND tag.is_deleted = false;
