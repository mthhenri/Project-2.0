/**
 * Gera o diagrama interativo da modelagem a partir do banco **migrado** (task de ferramenta, sem spec):
 *
 *   npm run modelagem                    # banco de desenvolvimento (DB_NOME do .env; `npm run dev` já migra)
 *   npm run modelagem -- --teste         # banco de teste (<DB_NOME>_teste, criado por `npm run test:integracao`)
 *
 * Lê colunas, chaves primárias e estrangeiras do catálogo do PostgreSQL, junta com
 * `modelagem.config.json` (grupos, posições, referências sem FK) e escreve o contrato `ModelagemDiagrama`
 * em `frontend/src/app/modules/modelagem/data/modelagem.dados.ts`, que a tela Modelagem lê. Só lê o banco. A saída é
 * determinística (sem data), então o `git diff` do JSON mostra só mudanças reais de modelagem.
 */
import * as fs from 'fs';
import * as path from 'path';
import knex, { Knex } from 'knex';
import configuracaoKnex from '../knexfile';
import { lerConfiguracaoBancoTeste, montarConfiguracaoKnex } from '../../testes/configuracao-banco-teste';
import {
  ChaveBanco,
  ColunaBanco,
  ConfiguracaoModelagem,
  montarDiagrama,
  montarModelo,
  posicionar,
  serializarDiagrama,
} from './modelagem';

const RAIZ = path.resolve(__dirname, '../../../..');
const ARQUIVO_CONFIGURACAO = path.join(__dirname, 'modelagem.config.json');
const ARQUIVO_SAIDA = path.join(RAIZ, 'frontend/src/app/modules/modelagem/data/modelagem.dados.ts');

async function lerColunas(conexao: Knex): Promise<ColunaBanco[]> {
  const resultado = await conexao.raw(
    `SELECT table_name AS tabela, column_name AS coluna, data_type AS tipo, udt_name AS "tipoInterno",
            (is_nullable = 'YES') AS anulavel, column_default AS padrao
       FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`,
  );
  return resultado.rows;
}

async function lerChaves(conexao: Knex, tipo: 'p' | 'f'): Promise<ChaveBanco[]> {
  const resultado = await conexao.raw(
    `SELECT tabela_origem.relname AS tabela, coluna_origem.attname AS coluna,
            tabela_destino.relname AS "tabelaDestino", coluna_destino.attname AS "colunaDestino"
       FROM pg_constraint restricao
       JOIN pg_class tabela_origem ON tabela_origem.oid = restricao.conrelid
       CROSS JOIN LATERAL unnest(restricao.conkey, COALESCE(restricao.confkey, restricao.conkey)) AS par(numero_origem, numero_destino)
       JOIN pg_attribute coluna_origem ON coluna_origem.attrelid = restricao.conrelid AND coluna_origem.attnum = par.numero_origem
       LEFT JOIN pg_class tabela_destino ON tabela_destino.oid = restricao.confrelid
       LEFT JOIN pg_attribute coluna_destino ON coluna_destino.attrelid = restricao.confrelid AND coluna_destino.attnum = par.numero_destino
      WHERE restricao.contype = :tipo AND restricao.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY 1, 2`,
    { tipo },
  );
  return resultado.rows;
}

async function lerUltimaMigration(conexao: Knex): Promise<string> {
  try {
    const resultado = await conexao.raw('SELECT name AS nome FROM knex_migrations ORDER BY id DESC LIMIT 1');
    return resultado.rows[0]?.nome?.replace(/\.sql$/, '') ?? 'nenhuma migration aplicada';
  } catch {
    return 'migrations não encontradas';
  }
}

async function gerarModelagem(): Promise<void> {
  const usarBancoTeste = process.argv.includes('--teste');
  const conexao = knex(
    usarBancoTeste ? montarConfiguracaoKnex(lerConfiguracaoBancoTeste()) : { ...configuracaoKnex, migrations: undefined },
  );
  try {
    const [colunas, primarias, estrangeiras, ultimaMigration] = await Promise.all([
      lerColunas(conexao),
      lerChaves(conexao, 'p'),
      lerChaves(conexao, 'f'),
      lerUltimaMigration(conexao),
    ]);
    const configuracao: ConfiguracaoModelagem = JSON.parse(fs.readFileSync(ARQUIVO_CONFIGURACAO, 'utf8'));

    const modelo = montarModelo(colunas, primarias, estrangeiras, configuracao);
    const posicionado = posicionar(modelo, configuracao.posicoes, Object.keys(configuracao.grupos));
    const origem = `PostgreSQL · última migration: ${ultimaMigration}`;
    const diagrama = montarDiagrama(posicionado.tabelas, configuracao, origem, [...modelo.avisos, ...posicionado.avisos]);

    fs.mkdirSync(path.dirname(ARQUIVO_SAIDA), { recursive: true });
    fs.writeFileSync(ARQUIVO_SAIDA, serializarDiagrama(diagrama));
    console.log(`Diagrama gerado: ${path.relative(RAIZ, ARQUIVO_SAIDA)} (${diagrama.tabelas.length} tabelas, ${origem}).`);
    for (const aviso of diagrama.avisos) console.warn(`  aviso: ${aviso}`);
  } finally {
    await conexao.destroy();
  }
}

gerarModelagem().catch((erro) => {
  console.error(`Falha ao gerar a modelagem: ${(erro as Error).message}`);
  console.error('O banco precisa estar no ar e migrado (`npm run db:up` e `npm run db:migrate`).');
  process.exit(1);
});
