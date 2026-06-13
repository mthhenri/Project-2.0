import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE demanda_tag (
      id            SERIAL    PRIMARY KEY,
      created_date  TIMESTAMP NOT NULL,
      updated_date  TIMESTAMP NOT NULL,
      is_deleted    BOOLEAN   NOT NULL,
      deleted_date  TIMESTAMP,

      demanda_id  INTEGER NOT NULL REFERENCES demanda(id),
      tag_id      INTEGER NOT NULL REFERENCES tag(id)
    );

    CREATE UNIQUE INDEX uix_demanda_tag_ativa
      ON demanda_tag(demanda_id, tag_id)
      WHERE is_deleted = false;

    CREATE TRIGGER trg_demanda_tag_updated_date
      BEFORE UPDATE ON demanda_tag
      FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_demanda_tag_updated_date ON demanda_tag;
    DROP TABLE IF EXISTS demanda_tag CASCADE;
  `);
}
