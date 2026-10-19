import * as dotenv from 'dotenv';
import * as path from 'path';
import type { Knex } from 'knex';
import { SqlMigrationSource } from '../database/sql-migration-source';

// process.env é intencional aqui: a infraestrutura de teste roda fora do contexto NestJS (como o
// knexfile.ts), e este é o único lugar dos testes que lê o ambiente.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface ConfiguracaoBancoTeste {
  host: string;
  porta: number;
  usuario: string;
  senha: string;
  /** Banco de desenvolvimento — só para recusar usá-lo como banco de teste. */
  nomeDesenvolvimento: string;
  nomeTeste: string;
  fusoHorario: string;
}

const SUFIXO_BANCO_TESTE = '_teste';

/** Nome do banco de teste: `DB_NOME_TESTE` ou `<DB_NOME>_teste`. Recusa qualquer nome que possa ser o de desenvolvimento. */
export function resolverNomeBancoTeste(nomeDesenvolvimento: string, nomeConfigurado?: string): string {
  const nomeTeste = nomeConfigurado || `${nomeDesenvolvimento}${SUFIXO_BANCO_TESTE}`;
  const terminaEmTeste = nomeTeste.endsWith(SUFIXO_BANCO_TESTE);
  const eConfigurado = !!nomeConfigurado && nomeTeste === nomeConfigurado;
  if (nomeTeste === nomeDesenvolvimento || (!terminaEmTeste && !eConfigurado)) {
    throw new Error(
      `Recusado: "${nomeTeste}" não é um banco de teste seguro (deve terminar em "${SUFIXO_BANCO_TESTE}" e ser diferente de "${nomeDesenvolvimento}").`,
    );
  }
  return nomeTeste;
}

function obrigatoria(chave: string): string {
  const valor = process.env[chave];
  if (!valor) throw new Error(`Variável de ambiente obrigatória ausente para os testes de integração: ${chave}`);
  return valor;
}

export function lerConfiguracaoBancoTeste(): ConfiguracaoBancoTeste {
  const nomeDesenvolvimento = obrigatoria('DB_NOME');
  return {
    host: obrigatoria('DB_HOST'),
    porta: Number(obrigatoria('DB_PORT')),
    usuario: obrigatoria('DB_USUARIO'),
    senha: obrigatoria('DB_SENHA'),
    nomeDesenvolvimento,
    nomeTeste: resolverNomeBancoTeste(nomeDesenvolvimento, process.env.DB_NOME_TESTE),
    fusoHorario: process.env.APP_TIMEZONE ?? 'America/Sao_Paulo',
  };
}

/** Configuração do Knex apontada para um banco do servidor de teste (por padrão, o próprio banco de teste). */
export function montarConfiguracaoKnex(
  configuracao: ConfiguracaoBancoTeste,
  nomeBanco: string = configuracao.nomeTeste,
  comMigrations = false,
): Knex.Config {
  return {
    client: 'pg',
    connection: {
      host: configuracao.host,
      port: configuracao.porta,
      database: nomeBanco,
      user: configuracao.usuario,
      password: configuracao.senha,
      ssl: false,
    },
    pool: {
      min: 0,
      max: 4,
      afterCreate: (conexao: any, done: any) => {
        conexao.query(`SET TIME ZONE '${configuracao.fusoHorario}'`, (erro: unknown) => done(erro, conexao));
      },
    },
    ...(comMigrations && {
      migrations: {
        migrationSource: new SqlMigrationSource(path.resolve(__dirname, '../database/migrations')),
      },
    }),
  };
}
