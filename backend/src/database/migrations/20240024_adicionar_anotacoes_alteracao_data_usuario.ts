import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE usuario ADD COLUMN anotacoes_alteracao_data TIMESTAMPTZ;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE usuario DROP COLUMN IF EXISTS anotacoes_alteracao_data;
  `);
}
