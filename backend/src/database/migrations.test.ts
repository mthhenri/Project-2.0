import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { SqlMigrationSource } from './sql-migration-source';

// Invariantes das migrations reais do repositório (SYSTEM.SPEC.md §9.5 e skill sql-migrations).
const diretorio = path.join(__dirname, 'migrations');
const arquivos = fs.readdirSync(diretorio).filter((arquivo) => arquivo.endsWith('.sql'));

test('todo .sql do diretório segue o padrão "NNNN - Nome.sql"', () => {
  const fora = arquivos.filter((arquivo) => !/^\d{4,} - .+\.sql$/.test(arquivo));
  assert.deepEqual(fora, []);
});

test('a numeração é única e contínua a partir de 0001', () => {
  const numeros = arquivos.map((arquivo) => Number(arquivo.match(/^(\d+)/)![1])).sort((a, b) => a - b);
  assert.deepEqual(numeros, numeros.map((_, indice) => indice + 1));
});

test('toda migration tem -- UP e -- DOWN e nenhuma controla a transação à mão', async () => {
  const fonte = new SqlMigrationSource(diretorio);
  const problemas: string[] = [];
  for (const arquivo of await fonte.getMigrations()) {
    const conteudo = fs.readFileSync(path.join(diretorio, arquivo), 'utf-8');
    const linhasBrutas = conteudo.split(/\r?\n/);
    const linhas = linhasBrutas.map((linha) => linha.trim());
    if (!linhas.includes('-- UP')) problemas.push(`${arquivo}: sem -- UP`);
    if (!linhas.includes('-- DOWN')) problemas.push(`${arquivo}: sem -- DOWN`);
    // Controle de transação é instrução na coluna 0 terminada em ";". O `BEGIN` sem ";" e
    // indentado do corpo de função PL/pgSQL (migrations 0001 e 0016) é legítimo.
    if (linhasBrutas.some((linha) => /^(BEGIN(\s+TRANSACTION)?\s*;|START\s+TRANSACTION|COMMIT\s*;|ROLLBACK\s*;)/i.test(linha))) {
      problemas.push(`${arquivo}: controla transação manualmente`);
    }
    await fonte.getMigration(arquivo); // falha se o parse quebrar
  }
  assert.deepEqual(problemas, []);
});
