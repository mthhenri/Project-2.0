import type { Knex } from 'knex';

// Tabelas com campos de auditoria da BaseEntity (created_date / updated_date / deleted_date),
// todas gravadas por NOW() do banco → semântica UTC naïve.
const TABELAS_COM_BASE_ENTITY = [
  'usuario',
  'projeto',
  'tag',
  'demanda',
  'demanda_usuario',
  'demanda_conexao',
  'demanda_tag',
  'atividade',
  'atividade_tag',
  'execucao',
  'dia_nao_util',
];

const FUSO_APLICACAO = 'America/Sao_Paulo';

/**
 * Converte as colunas de data/hora de `timestamp without time zone` (naïve) para
 * `timestamptz`, preservando o instante real de cada coluna conforme sua semântica
 * de gravação:
 *
 * - created_date / updated_date / deleted_date (todas as tabelas) foram gravadas por
 *   NOW() → reinterpretadas como UTC.
 * - execucao.inicio_data / fim_data foram gravadas pelo app em relógio de parede BRT
 *   → reinterpretadas como America/Sao_Paulo.
 *
 * O `USING ... AT TIME ZONE 'zone'` é determinístico (independe do fuso da sessão):
 * interpreta o valor naïve como sendo daquele fuso e produz o instante correto.
 * Colunas `date` puras (projeto.inicio_data, *.previsao_fim_data, dia_nao_util.dia_data)
 * NÃO são tocadas.
 */
export async function up(knex: Knex): Promise<void> {
  for (const tabela of TABELAS_COM_BASE_ENTITY) {
    await knex.raw(`
      ALTER TABLE ${tabela}
        ALTER COLUMN created_date TYPE timestamptz USING created_date AT TIME ZONE 'UTC',
        ALTER COLUMN updated_date TYPE timestamptz USING updated_date AT TIME ZONE 'UTC',
        ALTER COLUMN deleted_date TYPE timestamptz USING deleted_date AT TIME ZONE 'UTC';
    `);
  }

  await knex.raw(`
    ALTER TABLE execucao
      ALTER COLUMN inicio_data TYPE timestamptz USING inicio_data AT TIME ZONE '${FUSO_APLICACAO}',
      ALTER COLUMN fim_data    TYPE timestamptz USING fim_data    AT TIME ZONE '${FUSO_APLICACAO}';
  `);
}

/**
 * Reverte para `timestamp without time zone`, restaurando o relógio de parede original
 * de cada coluna (UTC para auditoria; BRT para inicio/fim de execução).
 */
export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE execucao
      ALTER COLUMN inicio_data TYPE timestamp USING inicio_data AT TIME ZONE '${FUSO_APLICACAO}',
      ALTER COLUMN fim_data    TYPE timestamp USING fim_data    AT TIME ZONE '${FUSO_APLICACAO}';
  `);

  for (const tabela of TABELAS_COM_BASE_ENTITY) {
    await knex.raw(`
      ALTER TABLE ${tabela}
        ALTER COLUMN created_date TYPE timestamp USING created_date AT TIME ZONE 'UTC',
        ALTER COLUMN updated_date TYPE timestamp USING updated_date AT TIME ZONE 'UTC',
        ALTER COLUMN deleted_date TYPE timestamp USING deleted_date AT TIME ZONE 'UTC';
    `);
  }
}
