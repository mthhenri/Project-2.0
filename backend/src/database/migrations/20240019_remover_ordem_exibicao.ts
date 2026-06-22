import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE demanda   DROP COLUMN IF EXISTS ordem_exibicao;
    ALTER TABLE atividade DROP COLUMN IF EXISTS ordem_exibicao;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE demanda ADD COLUMN ordem_exibicao INTEGER;
    UPDATE demanda SET ordem_exibicao = 0;
    ALTER TABLE demanda ALTER COLUMN ordem_exibicao SET NOT NULL;

    ALTER TABLE atividade ADD COLUMN ordem_exibicao INTEGER;
    UPDATE atividade SET ordem_exibicao = 0;
    ALTER TABLE atividade ALTER COLUMN ordem_exibicao SET NOT NULL;
  `);
}
