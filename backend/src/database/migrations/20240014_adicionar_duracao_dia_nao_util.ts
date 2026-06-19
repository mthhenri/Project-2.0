import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE dia_nao_util ADD COLUMN duracao VARCHAR(20);

    UPDATE dia_nao_util SET duracao = 'INTEGRAL';

    ALTER TABLE dia_nao_util ALTER COLUMN duracao SET NOT NULL;

    ALTER TABLE dia_nao_util
      ADD CONSTRAINT ck_dia_nao_util_duracao
      CHECK (duracao IN ('INTEGRAL', 'MEIO_PERIODO'));
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE dia_nao_util DROP CONSTRAINT IF EXISTS ck_dia_nao_util_duracao;
    ALTER TABLE dia_nao_util DROP COLUMN IF EXISTS duracao;
  `);
}
