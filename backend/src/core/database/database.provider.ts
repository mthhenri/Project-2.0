import Knex from 'knex';
import configuracao from '../../database/knexfile';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide:    DATABASE_CONNECTION,
  useFactory: () => Knex(configuracao),
};
