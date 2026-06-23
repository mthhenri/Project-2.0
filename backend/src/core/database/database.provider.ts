import Knex from 'knex';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide:    DATABASE_CONNECTION,
  inject:     [ConfigService],
  useFactory: (configService: ConfigService) => {
    const { host, porta, nome, usuario, senha, ssl } = configService.obter().bancoDados;
    return Knex({
      client: 'pg',
      connection: {
        host,
        port:     porta,
        database: nome,
        user:     usuario,
        password: senha,
        ssl:      ssl ? { rejectUnauthorized: false } : false,
      },
      migrations: {
        directory: path.resolve(__dirname, '../../database/migrations'),
        extension: 'ts',
      },
    });
  },
};
