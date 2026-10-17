import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SqlMigrationSource } from './sql-migration-source';

function criarDiretorio(arquivos: Record<string, string>): string {
  const diretorio = fs.mkdtempSync(path.join(os.tmpdir(), 'migrations-'));
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    fs.writeFileSync(path.join(diretorio, nome), conteudo);
  }
  return diretorio;
}

/** Knex falso: `raw` devolve o SQL recebido para o teste conferir o que seria executado. */
const knexFalso = { raw: (sql: string) => sql } as never;

test('ordena pelo prefixo numérico e ignora arquivos fora do padrão', async () => {
  const diretorio = criarDiretorio({
    '0002 - Segunda.sql': '-- UP\nSELECT 2;',
    '0010 - Décima.sql': '-- UP\nSELECT 10;',
    '10000 - Cinco dígitos.sql': '-- UP\nSELECT 10000;',
    '0001 - Primeira.sql': '-- UP\nSELECT 1;',
    'notas.txt': 'não é migration',
    '0003-sem-espacos.sql': '-- UP\nSELECT 3;',
  });
  const migrations = await new SqlMigrationSource(diretorio).getMigrations();
  assert.deepEqual(migrations, [
    '0001 - Primeira.sql',
    '0002 - Segunda.sql',
    '0010 - Décima.sql',
    '10000 - Cinco dígitos.sql',
  ]);
});

test('separa as seções UP e DOWN e entrega cada uma ao knex.raw', async () => {
  const diretorio = criarDiretorio({
    '0001 - Cria tabela.sql': '-- UP\nCREATE TABLE a (id int);\n\n-- DOWN\nDROP TABLE a;\n',
  });
  const fonte = new SqlMigrationSource(diretorio);
  const migration = await fonte.getMigration('0001 - Cria tabela.sql');
  assert.equal(await migration.up(knexFalso), 'CREATE TABLE a (id int);');
  assert.equal(await migration.down(knexFalso), 'DROP TABLE a;');
  assert.equal(migration.config, undefined);
});

test('aceita fim de linha CRLF e marcadores com espaços ao redor', async () => {
  const diretorio = criarDiretorio({
    '0001 - Crlf.sql': '  -- UP  \r\nSELECT 1;\r\n-- DOWN\r\nSELECT 2;\r\n',
  });
  const migration = await new SqlMigrationSource(diretorio).getMigration('0001 - Crlf.sql');
  assert.equal(await migration.up(knexFalso), 'SELECT 1;');
  assert.equal(await migration.down(knexFalso), 'SELECT 2;');
});

test('sem -- DOWN o rollback falha ao ser chamado, mas down continua sendo função', async () => {
  const diretorio = criarDiretorio({ '0001 - So up.sql': '-- UP\nSELECT 1;' });
  const migration = await new SqlMigrationSource(diretorio).getMigration('0001 - So up.sql');
  assert.equal(typeof migration.down, 'function');
  assert.throws(() => migration.down(knexFalso), /não possui seção "-- DOWN"/);
});

test('sem -- UP a leitura falha alto e cedo', async () => {
  const diretorio = criarDiretorio({ '0001 - Sem up.sql': 'SELECT 1;' });
  await assert.rejects(
    new SqlMigrationSource(diretorio).getMigration('0001 - Sem up.sql'),
    /não possui o marcador "-- UP"/,
  );
});

test('-- NO TRANSACTION desliga a transação só naquela migration', async () => {
  const diretorio = criarDiretorio({
    '0001 - Indice.sql': '-- NO TRANSACTION\n-- UP\nCREATE INDEX CONCURRENTLY ix ON a (b);\n-- DOWN\nDROP INDEX ix;',
  });
  const migration = await new SqlMigrationSource(diretorio).getMigration('0001 - Indice.sql');
  assert.deepEqual(migration.config, { transaction: false });
});

test('o nome gravado em knex_migrations é o nome do arquivo', () => {
  assert.equal(new SqlMigrationSource('.').getMigrationName('0001 - X.sql'), '0001 - X.sql');
});
