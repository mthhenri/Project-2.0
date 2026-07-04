import type { Knex } from 'knex';
import * as fs from 'fs';
import * as path from 'path';

// Mecanismo de infraestrutura (não é entidade de negócio) → inglês, conforme a regra de
// linguagem (§4). Faz o Knex ler migrations de arquivos `.sql` puros em vez de módulos `.ts`
// com funções up/down. Cada arquivo é nomeado `NNNN - Nome descritivo.sql` e dividido em duas
// seções pelos marcadores `-- UP` / `-- DOWN` (cada um sozinho na sua linha).

/** Regex do nome de arquivo de migration: 4+ dígitos, " - ", nome descritivo, `.sql`. */
const PADRAO_ARQUIVO_MIGRATION = /^\d{4,} - .+\.sql$/;

const MARCADOR_UP = '-- UP';
const MARCADOR_DOWN = '-- DOWN';
const MARCADOR_SEM_TRANSACAO = '-- NO TRANSACTION';

/**
 * Estende o `Knex.Migration` com o `config` por-migration que o Migrator lê em runtime
 * (`get(migrationContent, 'config.transaction')`) mas que a tipagem pública não declara.
 */
interface MigrationComConfig extends Knex.Migration {
  config?: { transaction?: boolean };
}

/** Resultado de separar o conteúdo de um arquivo `.sql` nas seções up/down. */
interface SecoesSql {
  up: string;
  down: string | null;
  semTransacao: boolean;
}

/**
 * `Knex.MigrationSource` que lê migrations de arquivos `.sql` de um diretório.
 * Registrado em `knexfile.ts` (CLI) e `database.provider.ts` (runtime) via `migrationSource`.
 */
export class SqlMigrationSource implements Knex.MigrationSource<string> {
  constructor(private readonly diretorioMigrations: string) {}

  /**
   * Lista os arquivos `.sql` do diretório que casam com o padrão de nome, ordenados pelo
   * prefixo numérico (ordem de execução) — nunca alfabético, para não quebrar quando a
   * numeração passar de 4 para 5 dígitos.
   */
  async getMigrations(): Promise<string[]> {
    const arquivos = fs
      .readdirSync(this.diretorioMigrations)
      .filter((arquivo) => PADRAO_ARQUIVO_MIGRATION.test(arquivo));

    return arquivos.sort(
      (primeiro, segundo) =>
        this.extrairPrefixoNumerico(primeiro) - this.extrairPrefixoNumerico(segundo),
    );
  }

  /** O nome gravado em `knex_migrations.name` é o próprio nome do arquivo. */
  getMigrationName(migration: string): string {
    return migration;
  }

  /**
   * Lê o arquivo, separa em up/down pelos marcadores e devolve funções que repassam cada
   * seção ao `knex.raw()`. O `knex` recebido já é a conexão transacionada que o Migrator
   * injeta — por isso o `.sql` nunca deve conter BEGIN/COMMIT/ROLLBACK.
   */
  async getMigration(migration: string): Promise<MigrationComConfig> {
    const conteudo = fs.readFileSync(
      path.join(this.diretorioMigrations, migration),
      'utf-8',
    );
    const secoes = this.separarSecoes(conteudo, migration);

    const resultado: MigrationComConfig = {
      up: (knex: Knex) => knex.raw(secoes.up),
      down: (knex: Knex) => {
        if (secoes.down === null) {
          throw new Error(
            `Migration "${migration}" não possui seção "-- DOWN" e não pode ser revertida.`,
          );
        }
        return knex.raw(secoes.down);
      },
    };

    // Migrations com instruções proibidas dentro de transação (ex.: CREATE INDEX
    // CONCURRENTLY) sinalizam com "-- NO TRANSACTION"; só então desabilitamos a transação
    // que o Knex abriria por padrão.
    if (secoes.semTransacao) {
      resultado.config = { transaction: false };
    }

    return resultado;
  }

  /** Prefixo numérico do nome do arquivo (dígitos iniciais antes do " - "). */
  private extrairPrefixoNumerico(arquivo: string): number {
    const correspondencia = arquivo.match(/^(\d+)/);
    return correspondencia ? Number(correspondencia[1]) : 0;
  }

  /**
   * Divide o conteúdo do arquivo nas seções `-- UP` e `-- DOWN`, comparando cada linha
   * exatamente (após `trim()`) contra os marcadores. Ausência do `-- UP` é erro de
   * configuração (falha alto e cedo). A seção `-- DOWN` é opcional.
   */
  private separarSecoes(conteudo: string, migration: string): SecoesSql {
    const linhas = conteudo.split(/\r?\n/);

    let indiceUp = -1;
    let indiceDown = -1;
    let semTransacao = false;

    linhas.forEach((linha, indice) => {
      const linhaLimpa = linha.trim();
      if (linhaLimpa === MARCADOR_UP) indiceUp = indice;
      else if (linhaLimpa === MARCADOR_DOWN) indiceDown = indice;
      else if (linhaLimpa === MARCADOR_SEM_TRANSACAO) semTransacao = true;
    });

    if (indiceUp === -1) {
      throw new Error(
        `Migration "${migration}" não possui o marcador "-- UP" obrigatório.`,
      );
    }

    const temDown = indiceDown !== -1 && indiceDown > indiceUp;
    const fimUp = temDown ? indiceDown : linhas.length;

    const up = linhas.slice(indiceUp + 1, fimUp).join('\n').trim();
    const down = temDown ? linhas.slice(indiceDown + 1).join('\n').trim() : null;

    return { up, down, semTransacao };
  }
}
