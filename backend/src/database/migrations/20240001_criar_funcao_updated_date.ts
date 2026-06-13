import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION fn_atualizar_updated_date()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_date = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP FUNCTION IF EXISTS fn_atualizar_updated_date() CASCADE;
  `);
}
