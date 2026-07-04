-- UP

-- Complemento do seed de tags padrão (0017): mais 19 tags. Mesmo padrão idempotente.

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Inovação', '#facc15', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Inovação' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Manutenção', '#78716c', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Manutenção' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Melhoria', '#84cc16', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Melhoria' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Hotfix', '#e11d48', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Hotfix' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Migração', '#0f766e', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Migração' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Automação', '#4d7c0f', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Automação' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Configuração', '#9a3412', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Configuração' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Pesquisa', '#7c3aed', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Pesquisa' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Mobile', '#2dd4bf', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Mobile' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Cloud', '#38bdf8', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Cloud' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Arquitetura', '#475569', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Arquitetura' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Integração', '#eab308', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Integração' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Acessibilidade', '#16a34a', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Acessibilidade' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Monitoramento', '#0891b2', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Monitoramento' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Homologação', '#a16207', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Homologação' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Deploy', '#4f46e5', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Deploy' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Revisão', '#fb7185', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Revisão' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Planejamento', '#a78bfa', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Planejamento' AND tag.is_deleted = false);

INSERT INTO tag (nome, cor, created_date, updated_date, is_deleted)
SELECT 'Análise', '#c026d3', NOW(), NOW(), false
WHERE NOT EXISTS (SELECT 1 FROM tag WHERE tag.nome = 'Análise' AND tag.is_deleted = false);

-- DOWN

-- Remove apenas as tags ATIVAS semeadas neste complemento; preserva soft-deletadas homônimas.
DELETE FROM tag WHERE tag.nome = 'Inovação' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Manutenção' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Melhoria' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Hotfix' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Migração' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Automação' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Configuração' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Pesquisa' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Mobile' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Cloud' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Arquitetura' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Integração' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Acessibilidade' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Monitoramento' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Homologação' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Deploy' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Revisão' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Planejamento' AND tag.is_deleted = false;
DELETE FROM tag WHERE tag.nome = 'Análise' AND tag.is_deleted = false;
