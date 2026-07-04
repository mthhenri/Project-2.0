-- UP

-- Feriados nacionais de DATA FIXA (recorrente = true, tipo = FERIADO, duracao = INTEGRAL).
-- Idempotente por mês/dia (o ano de referência 2024 é só uma âncora YYYY-MM-DD).

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-01-01', 'Confraternização Universal', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 1
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 1
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-04-21', 'Tiradentes', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 4
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 21
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-05-01', 'Dia do Trabalho', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 5
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 1
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-09-07', 'Independência do Brasil', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 9
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 7
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-10-12', 'Nossa Senhora Aparecida', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 10
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 12
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-11-02', 'Finados', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 11
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 2
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-11-15', 'Proclamação da República', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 11
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 15
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 11
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 20
);

INSERT INTO dia_nao_util (dia_data, descricao, tipo, recorrente, duracao, created_date, updated_date, is_deleted)
SELECT '2024-12-25', 'Natal', 'FERIADO', true, 'INTEGRAL', NOW(), NOW(), false
WHERE NOT EXISTS (
  SELECT 1 FROM dia_nao_util
  WHERE dia_nao_util.recorrente = true
    AND dia_nao_util.is_deleted = false
    AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 12
    AND EXTRACT(DAY   FROM dia_nao_util.dia_data) = 25
);

-- DOWN

-- Remove apenas as linhas ATIVAS semeadas, pelo mesmo critério de identidade (mês/dia + recorrente).
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 1  AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 1;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 4  AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 21;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 5  AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 1;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 9  AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 7;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 10 AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 12;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 11 AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 2;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 11 AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 15;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 11 AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 20;
DELETE FROM dia_nao_util
WHERE dia_nao_util.recorrente = true AND dia_nao_util.is_deleted = false
  AND EXTRACT(MONTH FROM dia_nao_util.dia_data) = 12 AND EXTRACT(DAY FROM dia_nao_util.dia_data) = 25;
