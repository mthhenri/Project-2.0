import type { Knex } from 'knex';
import * as bcrypt from 'bcrypt';

const LOGIN_GESTOR_INICIAL = 'gestor.inicial';
const SENHA_GESTOR_INICIAL = 'project2026';

export async function up(knex: Knex): Promise<void> {
  const senhaEncriptada = await bcrypt.hash(SENHA_GESTOR_INICIAL, 10);

  // Idempotente: só insere se ainda não houver gestor inicial ativo com esse login.
  await knex.raw(
    `INSERT INTO usuario (
       login, senha_encriptada, nome_completo, cargo_titulo,
       tipo, horas_diarias_necessarias, status,
       created_date, updated_date, is_deleted
     )
     SELECT
       :login, :senhaEncriptada, :nomeCompleto, :cargoTitulo,
       :tipo, :horasDiariasNecessarias, :status,
       NOW(), NOW(), false
     WHERE NOT EXISTS (
       SELECT 1 FROM usuario
       WHERE usuario.login = :login
         AND usuario.is_deleted = false
     )`,
    {
      login:                   LOGIN_GESTOR_INICIAL,
      senhaEncriptada,
      nomeCompleto:            'Gestor Inicial',
      cargoTitulo:             'Gestor',
      tipo:                    'GESTOR',
      horasDiariasNecessarias: 8,
      status:                  'ATIVO',
    },
  );
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DELETE FROM usuario
     WHERE usuario.login = :login`,
    { login: LOGIN_GESTOR_INICIAL },
  );
}
