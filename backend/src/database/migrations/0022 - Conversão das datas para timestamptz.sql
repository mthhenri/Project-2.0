-- UP

-- created_date/updated_date/deleted_date foram gravadas por NOW() (semântica UTC naïve)
-- → reinterpretadas como UTC. O AT TIME ZONE é determinístico (independe do fuso da sessão).

ALTER TABLE usuario
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE projeto
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE tag
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda_usuario
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda_conexao
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda_tag
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE atividade
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE atividade_tag
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE execucao
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE dia_nao_util
  ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';

-- execucao.inicio_data / fim_data foram gravadas em relógio de parede BRT → America/Sao_Paulo.
ALTER TABLE execucao
  ALTER COLUMN inicio_data TYPE timestamptz USING inicio_data AT TIME ZONE 'America/Sao_Paulo',
  ALTER COLUMN fim_data    TYPE timestamptz USING fim_data    AT TIME ZONE 'America/Sao_Paulo';

-- DOWN

ALTER TABLE execucao
  ALTER COLUMN inicio_data TYPE timestamp USING inicio_data AT TIME ZONE 'America/Sao_Paulo',
  ALTER COLUMN fim_data    TYPE timestamp USING fim_data    AT TIME ZONE 'America/Sao_Paulo';

ALTER TABLE usuario
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE projeto
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE tag
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda_usuario
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda_conexao
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE demanda_tag
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE atividade
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE atividade_tag
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE execucao
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';

ALTER TABLE dia_nao_util
  ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
  ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
  ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';
