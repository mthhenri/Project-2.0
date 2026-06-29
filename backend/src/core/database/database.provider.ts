import Knex from 'knex';
import * as path from 'path';
import { ConfigService } from '../../config/config.service';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProvider = {
  provide:    DATABASE_CONNECTION,
  inject:     [ConfigService],
  useFactory: (configService: ConfigService) => {
    const { host, porta, nome, usuario, senha, ssl } = configService.obter().bancoDados;
    const { fusoHorario } = configService.obter().aplicacao;
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
      pool: {
        // Fixa a sessão de cada conexão no fuso da aplicação (config de servidor, não
        // entrada de request) para que NOW() e o bucketing por dia das colunas timestamptz
        // (DATE/::date) operem no dia local. Interpolar a config do servidor aqui é aceitável.
        afterCreate: (conexao: any, done: any) => {
          conexao.query(`SET TIME ZONE '${fusoHorario}'`, (erro: unknown) => done(erro, conexao));
        },
      },
      migrations: {
        directory: path.resolve(__dirname, '../../database/migrations'),
        extension: 'ts',
      },
    });
  },
};
