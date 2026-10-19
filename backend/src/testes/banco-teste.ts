import Knex, { Knex as KnexTipos } from 'knex';
import { after, test, TestOptions } from 'node:test';
import {
  lerConfiguracaoBancoTeste,
  montarConfiguracaoKnex,
  ConfiguracaoBancoTeste,
} from './configuracao-banco-teste';

/** Conexão entregue ao teste: uma transação que sofre rollback no fim. */
export type ConexaoTeste = KnexTipos.Transaction;

let conexaoCompartilhada: KnexTipos | undefined;
let configuracaoCompartilhada: ConfiguracaoBancoTeste | undefined;

/** Conexão (pool) com o banco de teste, uma por processo de teste. Recusa banco que não seja o de teste. */
export function obterConexaoBancoTeste(): KnexTipos {
  if (!conexaoCompartilhada) {
    configuracaoCompartilhada = lerConfiguracaoBancoTeste();
    conexaoCompartilhada = Knex(montarConfiguracaoKnex(configuracaoCompartilhada));
  }
  return conexaoCompartilhada;
}

/** Nome do banco de teste em uso (para provar que não é o de desenvolvimento). */
export function obterNomeBancoTeste(): string {
  obterConexaoBancoTeste();
  return configuracaoCompartilhada!.nomeTeste;
}

/** Encerra o pool. Chamado pelo `after` de `testarComBanco`; seguro chamar mais de uma vez. */
export async function encerrarConexaoBancoTeste(): Promise<void> {
  const conexao = conexaoCompartilhada;
  conexaoCompartilhada = undefined;
  await conexao?.destroy();
}

let encerramentoRegistrado = false;

class RollbackDoTeste extends Error {}

/**
 * Executa `corpo` dentro de uma transação que sempre sofre rollback: nada que o teste grava
 * sobrevive. Repositories que abrem a própria transação (`conexao.transaction(...)`) viram
 * savepoints. Atenção: `NOW()` fica congelado no início da transação — as fábricas exigem datas
 * explícitas e o teste não deve depender de `NOW()` avançar.
 */
export async function executarIsolado(corpo: (conexao: ConexaoTeste) => Promise<void>): Promise<void> {
  const banco = obterConexaoBancoTeste();
  try {
    await banco.transaction(async (transacao) => {
      await corpo(transacao);
      throw new RollbackDoTeste();
    });
  } catch (erro) {
    if (erro instanceof RollbackDoTeste) return;
    throw traduzirFalhaDeConexao(erro);
  }
}

/** Troca o erro cru do driver por uma mensagem que diz o que fazer. */
function traduzirFalhaDeConexao(erro: unknown): unknown {
  const codigo = (erro as { code?: string })?.code;
  if (codigo === 'ECONNREFUSED' || codigo === 'ENOTFOUND' || codigo === '3D000' || codigo === 'ETIMEDOUT') {
    const { host, porta } = configuracaoCompartilhada ?? lerConfiguracaoBancoTeste();
    return new Error(
      `banco de teste indisponível em ${host}:${porta} (${codigo}). Suba o PostgreSQL com \`npm run db:up\` e use \`npm run test:integracao\`, que prepara o banco.`,
    );
  }
  return erro;
}

/**
 * `test` do node:test com isolamento: o corpo recebe uma transação descartada ao final.
 * Registra o encerramento do pool ao fim do arquivo.
 */
export function testarComBanco(nome: string, corpo: (conexao: ConexaoTeste) => Promise<void>): void;
export function testarComBanco(nome: string, opcoes: TestOptions, corpo: (conexao: ConexaoTeste) => Promise<void>): void;
export function testarComBanco(
  nome: string,
  opcoesOuCorpo: TestOptions | ((conexao: ConexaoTeste) => Promise<void>),
  corpoComOpcoes?: (conexao: ConexaoTeste) => Promise<void>,
): void {
  const opcoes = typeof opcoesOuCorpo === 'function' ? {} : opcoesOuCorpo;
  const corpo = typeof opcoesOuCorpo === 'function' ? opcoesOuCorpo : corpoComOpcoes!;
  if (!encerramentoRegistrado) {
    encerramentoRegistrado = true;
    after(() => encerrarConexaoBancoTeste());
  }
  test(nome, opcoes, () => executarIsolado(corpo));
}
