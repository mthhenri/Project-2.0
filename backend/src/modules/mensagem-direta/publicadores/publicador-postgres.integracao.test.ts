import { after, test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AutorMensagemDiretaEnum } from '@project20/shared';
import { ConfiguracaoBancoDados } from '../../../config/config.interface';
import { encerrarConexaoBancoTeste, obterConexaoBancoTeste } from '../../../testes/banco-teste';
import { lerConfiguracaoBancoTeste } from '../../../testes/configuracao-banco-teste';
import { MensagemDoBarramento } from '../domain/mensagem-direta-barramento';
import { CANAL_DE_EVENTOS_DIRETOS, PublicadorPostgres } from './publicador-postgres';

// O barramento de produção (task 209) contra o PostgreSQL real: DUAS instâncias do publicador, cada uma com a sua conexão de escuta, são o
// mesmo que duas instâncias da API. LISTEN/NOTIFY não grava nada em tabela, então não há o que limpar.

after(async () => {
  await encerrarConexaoBancoTeste();
});

function configuracao(): ConfiguracaoBancoDados {
  const teste = lerConfiguracaoBancoTeste();
  return { host: teste.host, porta: teste.porta, nome: teste.nomeTeste, usuario: teste.usuario, senha: teste.senha, ssl: false } as ConfiguracaoBancoDados;
}

async function esperar(condicao: () => boolean, descricao: string, ms = 8_000): Promise<void> {
  const limite = Date.now() + ms;
  while (!condicao()) {
    if (Date.now() > limite) assert.fail(`tempo esgotado: ${descricao}`);
    await new Promise((resolver) => setTimeout(resolver, 25));
  }
}

async function subir(vigia?: { intervaloDoPingEmMilissegundos: number; toleranciaSemEcoEmMilissegundos: number }) {
  const publicador = new PublicadorPostgres(obterConexaoBancoTeste(), configuracao(), vigia);
  const recebidas: MensagemDoBarramento[] = [];
  let reconexoes = 0;
  publicador.assinar({ aoReceber: (mensagem) => recebidas.push(mensagem), aoReconectar: () => { reconexoes++; } });
  publicador.onModuleInit();
  await esperar(() => publicador.estaEscutando(), 'o LISTEN ser aceito');
  return { publicador, recebidas, reconexoes: () => reconexoes };
}

function entrega(texto: string): MensagemDoBarramento {
  return {
    tipo: 'ENTREGA',
    usuarioIds: [4, 9],
    evento: {
      tipo: 'MENSAGEM',
      mensagem: {
        mensagemId: '7f0c2b9e-4c1a-4e6a-9d55-2f6c0d1b8a10', conversaId: '4-9', autor: AutorMensagemDiretaEnum.USUARIO, autorUsuarioId: 4,
        texto, contemCodigo: false, mencoes: [], referencias: [], createdDate: new Date('2026-10-21T14:05:11.482Z'),
      },
    },
  };
}

const ENTREGA = entrega('oi, pelo barramento');

test('o que uma instância publica chega às DUAS (inclusive a que publicou), com a data como Date', async () => {
  const primeira = await subir();
  const segunda = await subir();
  try {
    await primeira.publicador.publicar(ENTREGA);
    await esperar(() => primeira.recebidas.length === 1 && segunda.recebidas.length === 1, 'as duas instâncias receberem');
    assert.deepEqual(primeira.recebidas[0], ENTREGA);
    assert.deepEqual(segunda.recebidas[0], ENTREGA);
  } finally {
    await primeira.publicador.onModuleDestroy();
    await segunda.publicador.onModuleDestroy();
  }
});

test('a mensagem de 10.000 caracteres não cabe no NOTIFY: chega como SINCRONIZAR da conversa, sem erro', async () => {
  const instancia = await subir();
  try {
    await instancia.publicador.publicar(entrega('ç'.repeat(10_000)));
    await esperar(() => instancia.recebidas.length === 1, 'receber a referência');
    assert.deepEqual(instancia.recebidas[0], { tipo: 'ENTREGA', usuarioIds: [4, 9], evento: { tipo: 'SINCRONIZAR', conversaId: '4-9' } });
  } finally {
    await instancia.publicador.onModuleDestroy();
  }
});

test('notificação com carga inválida é ignorada, e a escuta continua entregando', async () => {
  const instancia = await subir();
  try {
    await obterConexaoBancoTeste().raw('SELECT pg_notify(:canal, :carga)', { canal: CANAL_DE_EVENTOS_DIRETOS, carga: 'isto não é json' });
    await instancia.publicador.publicar(ENTREGA);
    await esperar(() => instancia.recebidas.length === 1, 'receber só a válida');
    assert.deepEqual(instancia.recebidas[0], ENTREGA);
  } finally {
    await instancia.publicador.onModuleDestroy();
  }
});

test('se a conexão de escuta cai, a instância reconecta sozinha e avisa os ouvintes para os clientes relerem', async () => {
  const instancia = await subir();
  try {
    await obterConexaoBancoTeste().raw(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = current_database() AND pid <> pg_backend_pid() AND query = :listen`,
      { listen: `LISTEN ${CANAL_DE_EVENTOS_DIRETOS}` },
    );
    await esperar(() => instancia.reconexoes() === 1, 'reconectar e avisar', 15_000);
    assert.equal(instancia.publicador.estaEscutando(), true);

    await instancia.publicador.publicar(ENTREGA);
    await esperar(() => instancia.recebidas.length === 1, 'voltar a receber depois de reconectar');
  } finally {
    await instancia.publicador.onModuleDestroy();
  }
});

test('depois de parado, o publicador não escuta nem tenta reconectar', async () => {
  const instancia = await subir();
  await instancia.publicador.onModuleDestroy();
  assert.equal(instancia.publicador.estaEscutando(), false);
  await obterConexaoBancoTeste().raw('SELECT pg_notify(:canal, :carga)', { canal: CANAL_DE_EVENTOS_DIRETOS, carga: JSON.stringify(ENTREGA) });
  await new Promise((resolver) => setTimeout(resolver, 300));
  assert.equal(instancia.recebidas.length, 0);
});

test('vigia: com a escuta funcionando o PING volta e nada é reciclado', async () => {
  const instancia = await subir({ intervaloDoPingEmMilissegundos: 100, toleranciaSemEcoEmMilissegundos: 5_000 });
  try {
    await new Promise((resolver) => setTimeout(resolver, 800));
    assert.equal(instancia.reconexoes(), 0);
    assert.equal(instancia.recebidas.length, 0, 'o PING não aparece para os ouvintes');
    assert.equal(instancia.publicador.estaEscutando(), true);
  } finally {
    await instancia.publicador.onModuleDestroy();
  }
});

test('vigia: sem eco dentro da tolerância (conexão meio aberta) a escuta é reciclada e os ouvintes avisados', async () => {
  // Tolerância menor que o intervalo do PING: o eco nunca "chega a tempo", como numa conexão que parou de entregar.
  const instancia = await subir({ intervaloDoPingEmMilissegundos: 150, toleranciaSemEcoEmMilissegundos: 1 });
  try {
    await esperar(() => instancia.reconexoes() >= 1, 'reciclar a escuta sem eco', 15_000);
    await instancia.publicador.publicar(ENTREGA);
    await esperar(() => instancia.recebidas.length >= 1, 'continuar recebendo depois de reciclar', 15_000);
  } finally {
    await instancia.publicador.onModuleDestroy();
  }
});
