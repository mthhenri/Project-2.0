// Executado uma vez por rodada de `test:integracao`, antes dos arquivos de teste: cria o banco de
// teste se não existir e aplica as migrations pendentes. Roda no mesmo PostgreSQL do docker-compose.
import Knex from 'knex';
import { lerConfiguracaoBancoTeste, montarConfiguracaoKnex } from './configuracao-banco-teste';

async function prepararBancoTeste(): Promise<void> {
  const configuracao = lerConfiguracaoBancoTeste();
  const origem = `${configuracao.host}:${configuracao.porta}`;

  const administrativo = Knex(montarConfiguracaoKnex(configuracao, 'postgres'));
  try {
    const existente = await administrativo.raw('SELECT 1 FROM pg_database WHERE datname = :nome', {
      nome: configuracao.nomeTeste,
    });
    if (existente.rows.length === 0) {
      // Nome validado por resolverNomeBancoTeste (termina em _teste); identificadores não aceitam parâmetro.
      await administrativo.raw('CREATE DATABASE ??', [configuracao.nomeTeste]);
      console.log(`Banco de teste "${configuracao.nomeTeste}" criado em ${origem}.`);
    }
  } catch (erro) {
    const detalhe = (erro as { code?: string }).code || (erro as Error).message;
    console.error(`Banco de teste indisponível em ${origem} (${detalhe}).`);
    console.error('Suba o PostgreSQL com `npm run db:up` e rode de novo.');
    process.exit(1);
  } finally {
    await administrativo.destroy();
  }

  const conexao = Knex(montarConfiguracaoKnex(configuracao, configuracao.nomeTeste, true));
  try {
    const [, aplicadas] = await conexao.migrate.latest();
    console.log(`Banco de teste "${configuracao.nomeTeste}" pronto (${aplicadas.length} migration(s) aplicada(s)).`);
  } finally {
    await conexao.destroy();
  }
}

prepararBancoTeste().catch((erro) => {
  console.error(`Falha ao preparar o banco de teste: ${(erro as Error).message}`);
  process.exit(1);
});
