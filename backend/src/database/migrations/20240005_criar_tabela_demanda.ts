import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE demanda (
      id            SERIAL    PRIMARY KEY,
      created_date  TIMESTAMP NOT NULL,
      updated_date  TIMESTAMP NOT NULL,
      is_deleted    BOOLEAN   NOT NULL,
      deleted_date  TIMESTAMP,

      projeto_id        INTEGER      NOT NULL REFERENCES projeto(id),
      demanda_pai_id    INTEGER               REFERENCES demanda(id),
      nome              VARCHAR(255) NOT NULL,
      descricao_tecnica TEXT,
      descricao_cliente TEXT,
      documentacao      TEXT,
      horas_estimadas   INTEGER      NOT NULL,
      prioridade        VARCHAR(20)  NOT NULL
                          CHECK (prioridade IN ('BAIXA', 'MEDIA', 'ALTA', 'CRITICA')),
      status            VARCHAR(30)  NOT NULL
                          CHECK (status IN ('PLANEJADA', 'EM_DESENVOLVIMENTO', 'CONCLUIDA')),
      is_estrutural     BOOLEAN      NOT NULL,
      previsao_fim_data DATE,
      ordem_exibicao    INTEGER      NOT NULL
    );

    CREATE INDEX ix_demanda_projeto
      ON demanda(projeto_id)
      WHERE is_deleted = false;

    CREATE INDEX ix_demanda_pai
      ON demanda(demanda_pai_id)
      WHERE is_deleted = false AND demanda_pai_id IS NOT NULL;

    CREATE INDEX ix_demanda_status
      ON demanda(status)
      WHERE is_deleted = false;

    CREATE INDEX ix_demanda_prioridade
      ON demanda(prioridade)
      WHERE is_deleted = false;

    CREATE TRIGGER trg_demanda_updated_date
      BEFORE UPDATE ON demanda
      FOR EACH ROW EXECUTE FUNCTION fn_atualizar_updated_date();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_demanda_updated_date ON demanda;
    DROP TABLE IF EXISTS demanda CASCADE;
  `);
}
