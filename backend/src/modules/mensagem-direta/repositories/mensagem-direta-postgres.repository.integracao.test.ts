import { after } from 'node:test';
import { ConexaoTeste, obterConexaoBancoTeste, encerrarConexaoBancoTeste } from '../../../testes/banco-teste';
import { registrarContratoDeArmazenamentoDeMensagemDireta } from './armazenamento-de-mensagem-direta.contrato';
import { MensagemDiretaPostgresRepository } from './mensagem-direta-postgres.repository';

// Armazenamento provisório das mensagens entre colaboradores no Postgres (task 207), contra o banco de teste real: a MESMA suíte de contrato
// do OpenSearch e do Elasticsearch (ordem e cursor, idempotência, não lidas, busca sem acento, supervisão). O contrato conta com estado entre
// os cenários, então tudo roda numa transação só, descartada no fim (nada sobrevive e não há DELETE).

let transacao: ConexaoTeste | undefined;

registrarContratoDeArmazenamentoDeMensagemDireta(
  'PostgreSQL provisório',
  async () => {
    transacao = await obterConexaoBancoTeste().transaction();
    return new MensagemDiretaPostgresRepository(transacao);
  },
  async () => {
    await transacao?.rollback();
  },
  { sempreLigado: true },
);

after(async () => {
  await encerrarConexaoBancoTeste();
});
