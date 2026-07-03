import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    `INSERT INTO tipo_demanda_status (codigo, descricao, created_date, updated_date, is_deleted)
     SELECT :codigo, :descricao, NOW(), NOW(), false
     RETURNING id`,
    { codigo: 'CANCELADA', descricao: 'Cancelada' },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DELETE FROM tipo_demanda_status WHERE codigo = :codigo`,
    { codigo: 'CANCELADA' },
  );
}
