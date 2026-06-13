import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE dia_nao_util (
      id            SERIAL    PRIMARY KEY,
      created_date  TIMESTAMP NOT NULL,
      updated_date  TIMESTAMP NOT NULL,
      is_deleted    BOOLEAN   NOT NULL,
      deleted_date  TIMESTAMP,

      dia_data    DATE         NOT NULL,
      descricao   VARCHAR(255) NOT NULL,
      tipo        VARCHAR(30)  NOT NULL
                    CHECK (tipo IN ('FERIADO', 'RECESSO', 'PONTO_FACULTATIVO')),
      recorrente  BOOLEAN      NOT NULL
    );

    CREATE INDEX ix_dia_nao_util_dia_data
      ON dia_nao_util(dia_data)
      WHERE is_deleted = false;

    CREATE TRIGGER trg_dia_nao_util_updated_date
      BEFORE UPDATE ON dia_nao_util
      FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_dia_nao_util_updated_date ON dia_nao_util;
    DROP TABLE IF EXISTS dia_nao_util CASCADE;
  `);
}
