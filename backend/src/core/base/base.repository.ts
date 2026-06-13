import { Knex } from 'knex';

export abstract class BaseRepository<TEntity> {
  constructor(
    protected readonly conexaoBancoDados: Knex,
    protected readonly nomeTabela: string,
  ) {}

  protected async executarConsulta<TResult = TEntity>(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<TResult[]> {
    const resultado = await this.conexaoBancoDados.raw(consultaSQL, parametros as any);
    return resultado.rows as TResult[];
  }

  protected async executarComando(
    consultaSQL: string,
    parametros: Record<string, unknown> | unknown[] = {},
  ): Promise<void> {
    await this.conexaoBancoDados.raw(consultaSQL, parametros as any);
  }

  protected construirPaginacao(pagina: number, itensPorPagina: number): string {
    const deslocamento = (pagina - 1) * itensPorPagina;
    return `LIMIT ${itensPorPagina} OFFSET ${deslocamento}`;
  }

  protected construirOrdenacao(
    campo: string,
    direcao: 'ASC' | 'DESC' = 'ASC',
  ): string {
    return `ORDER BY ${campo} ${direcao}`;
  }

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
}
