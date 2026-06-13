import Knex from 'knex';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide:    DATABASE_CONNECTION,
  useFactory: (configService: ConfigService) => {
    const dbConfig = configService.database;
    return Knex({
      client: 'pg',
      connection: {
        host:     dbConfig.host,
        port:     dbConfig.port,
        database: dbConfig.nome,
        user:     dbConfig.usuario,
        password: dbConfig.senha,
      },
      migrations: {
        directory: path.resolve(__dirname, '../../database/migrations'),
        extension: 'ts',
      },
    });
  },
  inject: [ConfigService],
};
