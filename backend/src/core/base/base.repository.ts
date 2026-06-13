import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { DATABASE_CONNECTION } from '../database/database.provider';

export abstract class BaseRepository<TEntidade> {
  constructor(
    @Inject(DATABASE_CONNECTION)
    protected readonly conexaoBancoDados: Knex,
    protected readonly nomeTabela: string,
  ) {}

  /**
   * Executa uma query SQL e retorna os resultados tipados.
   */
  protected async executarConsulta<TResultado = TEntidade>(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<TResultado[]> {
    const resultado = await this.conexaoBancoDados.raw(consultaSQL, parametros as any);
    return resultado.rows as TResultado[];
  }

  /**
   * Executa um comando SQL sem retorno de dados (INSERT sem RETURNING, UPDATE, etc).
   */
  protected async executarComando(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<void> {
    await this.conexaoBancoDados.raw(consultaSQL, parametros as any);
  }

  /**
   * Executa soft delete na tabela do repositório.
   */
  protected async executarSoftDelete(identificador: number): Promise<void> {
    await this.executarComando(
      `UPDATE ${this.nomeTabela}
       SET is_deleted = true,
           deleted_date = NOW(),
           updated_date = NOW()
       WHERE id = :identificador`,
      { identificador },
    );
  }

  /**
   * Retorna cláusula SQL de paginação.
   */
  protected construirPaginacao(pagina: number, itensPorPagina: number): string {
    const deslocamento = (pagina - 1) * itensPorPagina;
    return `LIMIT ${itensPorPagina} OFFSET ${deslocamento}`;
  }

  /**
   * Retorna cláusula SQL de ordenação.
   */
  protected construirOrdenacao(
    campo: string,
    direcao: 'ASC' | 'DESC' = 'ASC',
  ): string {
    return `ORDER BY ${campo} ${direcao}`;
  }
}
