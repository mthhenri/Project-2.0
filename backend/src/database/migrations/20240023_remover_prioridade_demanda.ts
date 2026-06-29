import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX IF EXISTS ix_demanda_prioridade;
    ALTER TABLE demanda DROP COLUMN IF EXISTS prioridade;
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE demanda ADD COLUMN prioridade VARCHAR(20);
    UPDATE demanda SET prioridade = 'MEDIA';
    ALTER TABLE demanda ALTER COLUMN prioridade SET NOT NULL;
    ALTER TABLE demanda
      ADD CONSTRAINT chk_demanda_prioridade
      CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA'));

    CREATE INDEX ix_demanda_prioridade
      ON demanda(prioridade)
      WHERE is_deleted = false;
  `);
}
