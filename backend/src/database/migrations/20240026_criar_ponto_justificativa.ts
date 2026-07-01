import type { Knex } from 'knex';

/**
 * Cria a tabela `ponto_justificativa`: justificativa de ponto de um usuário num dia
 * específico, criada pelo gestor, que desconta horas da meta daquele dia. Tabela de
 * negócio (português) com BaseEntity em inglês (timestamptz) e sem DEFAULT.
 *
 * O teto de `horas_cobertas` (<= jornada diária do usuário) é regra de negócio validada
 * no service — não há como expressá-lo em CHECK cross-table. O CHECK aqui garante apenas
 * a não-negatividade. Objetos genéricos de banco (trigger/função) em inglês (§9.2 #12).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE ponto_justificativa (
      id            SERIAL      PRIMARY KEY,
      created_date  TIMESTAMPTZ NOT NULL,
      updated_date  TIMESTAMPTZ NOT NULL,
      is_deleted    BOOLEAN     NOT NULL,
      deleted_date  TIMESTAMPTZ,

      usuario_id      INTEGER      NOT NULL,
      gestor_id       INTEGER      NOT NULL,
      dia_data        DATE         NOT NULL,
      nome            VARCHAR(255) NOT NULL,
      descricao       TEXT         NOT NULL,
      horas_cobertas  NUMERIC(4,2) NOT NULL,

      CONSTRAINT fk_ponto_justificativa_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario(id),
      CONSTRAINT fk_ponto_justificativa_gestor
        FOREIGN KEY (gestor_id) REFERENCES usuario(id),
      CONSTRAINT chk_ponto_justificativa_horas_cobertas
        CHECK (horas_cobertas >= 0)
    );

    CREATE INDEX ix_ponto_justificativa_usuario_dia
      ON ponto_justificativa(usuario_id, dia_data)
      WHERE is_deleted = false;

    CREATE TRIGGER trg_ponto_justificativa_updated_date
      BEFORE UPDATE ON ponto_justificativa
      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_ponto_justificativa_updated_date ON ponto_justificativa;
    DROP TABLE IF EXISTS ponto_justificativa CASCADE;
  `);
}
