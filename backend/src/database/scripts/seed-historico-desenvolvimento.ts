import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import knex, { Knex } from 'knex';
import configuracao from '../knexfile';

export function validarAmbienteSeed(ambiente: NodeJS.ProcessEnv): void {
  if (ambiente.APP_AMBIENTE !== 'development' || ambiente.NODE_ENV === 'production' || ambiente.DB_SSL === 'true') {
    throw new Error('Seed permitido somente com APP_AMBIENTE=development, sem NODE_ENV=production ou DB_SSL=true.');
  }
}

export async function semearHistorico(conexao: Knex, ambiente: NodeJS.ProcessEnv): Promise<void> {
  validarAmbienteSeed(ambiente);
  const sql = readFileSync(join(__dirname, 'seed-historico-desenvolvimento.sql'), 'utf8');
  await conexao.transaction(async (transacao) => {
    await transacao.raw("SELECT set_config('project20.seed_ambiente', :ambiente, true)", { ambiente: ambiente.APP_AMBIENTE });
    await transacao.raw(sql);
  });
}

async function principal(): Promise<void> {
  // CLI fora do NestJS, seguindo o knexfile: não há ConfigService neste contexto.
  validarAmbienteSeed(process.env);
  const { validarDestinoConversas, semearConversas } = await import('./seed-conversas-desenvolvimento');
  validarDestinoConversas(process.env);
  const conexao = knex(configuracao);
  try {
    await semearHistorico(conexao, process.env);
    await semearConversas(conexao, process.env);
    console.log('Seed conferido: DEV-PORTAL, DEV-ESTOQUE e DEV-AGENDA. Contas dev.mateus.* / project2026.');
  } finally {
    await conexao.destroy();
  }
}

if (require.main === module) {
  principal().catch((erro) => {
    console.error((erro as Error).message);
    process.exitCode = 1;
  });
}
