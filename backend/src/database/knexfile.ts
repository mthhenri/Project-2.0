import type { Knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const configuracao: Knex.Config = {
  client: 'pg',
  connection: {
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT),
    database: process.env.DB_NOME,
    user:     process.env.DB_USUARIO,
    password: process.env.DB_SENHA,
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
};

export default configuracao;
