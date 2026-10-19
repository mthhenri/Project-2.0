import type { ConexaoTeste } from './banco-teste';

/**
 * Monta um repository com a conexão de teste, sem subir módulo Nest.
 * Os repositories recebem `Knex` no construtor; a transação do teste faz esse papel
 * (suporta `raw` e `transaction`, esta última como savepoint).
 */
export function criarRepositorio<TRepositorio>(
  classe: new (conexao: any) => TRepositorio,
  conexao: ConexaoTeste,
): TRepositorio {
  return new classe(conexao);
}
