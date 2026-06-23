import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

// process.env é intencional aqui: knexfile.ts é exclusivo da CLI do Knex (db:migrate/db:rollback)
// e roda fora do contexto NestJS, onde injeção de ConfigService não é possível.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const configuracao: Knex.Config = {
  client: 'pg',
  connection: {
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT),
    database: process.env.DB_NOME,
    user:     process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
};

export default configuracao;
