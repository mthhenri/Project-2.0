import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';
import { BaseRepository } from '../../../core/base/base.repository';
import { DATABASE_CONNECTION } from '../../../core/database/database.provider';
import { ChaveBanco, ColunaBanco } from '../domain/modelagem';

/**
 * Lê o catálogo do PostgreSQL (`information_schema` e `pg_catalog`), não tabelas do negócio: por isso as consultas não têm
 * `is_deleted` (o catálogo não tem soft delete) nem parâmetros (nada vem do usuário).
 */
@Injectable()
export class ModelagemCatalogoRepository extends BaseRepository<ColunaBanco> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    conexaoBancoDados: Knex,
  ) {
    super(conexaoBancoDados, 'information_schema.columns');
  }

  async listarColunas(): Promise<ColunaBanco[]> {
    return this.executarConsulta<ColunaBanco>(
      `SELECT coluna_catalogo.table_name AS tabela,
              coluna_catalogo.column_name AS coluna,
              coluna_catalogo.data_type AS tipo,
              coluna_catalogo.udt_name AS "tipoInterno",
              (coluna_catalogo.is_nullable = 'YES') AS anulavel,
              coluna_catalogo.column_default AS padrao
         FROM information_schema.columns coluna_catalogo
        WHERE coluna_catalogo.table_schema = 'public'
        ORDER BY coluna_catalogo.table_name, coluna_catalogo.ordinal_position`,
    );
  }

  async listarChavesPrimarias(): Promise<ChaveBanco[]> {
    return this.listarChaves('p');
  }

  async listarChavesEstrangeiras(): Promise<ChaveBanco[]> {
    return this.listarChaves('f');
  }

  /** Nome da última migration aplicada (`null` se nenhuma). */
  async obterUltimaMigration(): Promise<string | null> {
    const linhas = await this.executarConsulta<{ nome: string }>(
      'SELECT migracao.name AS nome FROM knex_migrations migracao ORDER BY migracao.id DESC LIMIT 1',
    );
    return linhas[0]?.nome ?? null;
  }

  // O tipo da restrição (`p` primária, `f` estrangeira) é uma constante interna, nunca entrada do usuário: vai no SQL por isso.
  private async listarChaves(tipoRestricao: 'p' | 'f'): Promise<ChaveBanco[]> {
    return this.executarConsulta<ChaveBanco>(
      `SELECT tabela_origem.relname AS tabela,
              coluna_origem.attname AS coluna,
              tabela_destino.relname AS "tabelaDestino",
              coluna_destino.attname AS "colunaDestino"
         FROM pg_constraint restricao
         JOIN pg_class tabela_origem ON tabela_origem.oid = restricao.conrelid
         CROSS JOIN LATERAL unnest(restricao.conkey, COALESCE(restricao.confkey, restricao.conkey)) AS par(numero_origem, numero_destino)
         JOIN pg_attribute coluna_origem ON coluna_origem.attrelid = restricao.conrelid AND coluna_origem.attnum = par.numero_origem
         LEFT JOIN pg_class tabela_destino ON tabela_destino.oid = restricao.confrelid
         LEFT JOIN pg_attribute coluna_destino ON coluna_destino.attrelid = restricao.confrelid AND coluna_destino.attnum = par.numero_destino
        WHERE restricao.contype = '${tipoRestricao}'
          AND restricao.connamespace = (SELECT namespace.oid FROM pg_namespace namespace WHERE namespace.nspname = 'public')
        ORDER BY tabela_origem.relname, coluna_origem.attname`,
    );
  }
}
