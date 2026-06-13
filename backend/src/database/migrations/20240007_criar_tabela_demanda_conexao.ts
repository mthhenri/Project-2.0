import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE demanda_conexao (
      id            SERIAL    PRIMARY KEY,
      created_date  TIMESTAMP NOT NULL,
      updated_date  TIMESTAMP NOT NULL,
      is_deleted    BOOLEAN   NOT NULL,
      deleted_date  TIMESTAMP,

      demanda_origem_id   INTEGER NOT NULL REFERENCES demanda(id),
      demanda_destino_id  INTEGER NOT NULL REFERENCES demanda(id),
      eh_bidirecional     BOOLEAN NOT NULL,

      CONSTRAINT chk_demanda_conexao_sem_autorreferencia
        CHECK (demanda_origem_id != demanda_destino_id)
    );

    CREATE UNIQUE INDEX uix_demanda_conexao_ativa
      ON demanda_conexao(demanda_origem_id, demanda_destino_id)
      WHERE is_deleted = false;

    CREATE INDEX ix_demanda_conexao_origem
      ON demanda_conexao(demanda_origem_id)
      WHERE is_deleted = false;

    CREATE INDEX ix_demanda_conexao_destino
      ON demanda_conexao(demanda_destino_id)
      WHERE is_deleted = false;

    CREATE TRIGGER trg_demanda_conexao_updated_date
      BEFORE UPDATE ON demanda_conexao
      FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_demanda_conexao_updated_date ON demanda_conexao;
    DROP TABLE IF EXISTS demanda_conexao CASCADE;
  `);
}
