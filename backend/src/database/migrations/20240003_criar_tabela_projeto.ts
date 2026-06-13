import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE projeto (
      id            SERIAL    PRIMARY KEY,
      created_date  TIMESTAMP NOT NULL,
      updated_date  TIMESTAMP NOT NULL,
      is_deleted    BOOLEAN   NOT NULL,
      deleted_date  TIMESTAMP,

      nome              VARCHAR(255) NOT NULL,
      codigo            VARCHAR(50)  NOT NULL,
      cor               VARCHAR(7)   NOT NULL,
      status            VARCHAR(20)  NOT NULL
                          CHECK (status IN ('ATIVO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO')),
      inicio_data       DATE,
      previsao_fim_data DATE
    );

    CREATE UNIQUE INDEX uix_projeto_codigo_ativo
      ON projeto(codigo)
      WHERE is_deleted = false;

    CREATE INDEX ix_projeto_status
      ON projeto(status)
      WHERE is_deleted = false;

    CREATE TRIGGER trg_projeto_updated_date
      BEFORE UPDATE ON projeto
      FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_projeto_updated_date ON projeto;
    DROP TABLE IF EXISTS projeto CASCADE;
  `);
}
