import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PlanoAbaEnum, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { PlanoService } from '../services/plano.service';
import { ConsultarPlanoFerramenta } from './consultar-plano.ferramenta';
import { EscreverNoPlanoFerramenta } from './escrever-no-plano.ferramenta';
import { ProporAlterarTrechoDoPlanoFerramenta } from './propor-alterar-trecho-do-plano.ferramenta';

// Ferramentas do planejamento (task 234): leitura do documento, escrita direta no rascunho (com a versão) e proposta de alterar um trecho.

const DESENVOLVEDOR = { sub: 1, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 2, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

/** O texto do usuário de uma exceção HTTP está em `getResponse().mensagem`, não em `message`. */
const comMotivo = (padrao: RegExp) => (erro: unknown) => padrao.test(((erro as BusinessException).getResponse() as { mensagem: string }).mensagem);

function criarPlanoService(texto: { tecnica?: string | null; cliente?: string | null; documentacao?: string | null } = {}) {
  const plano = { id: 7, titulo: 'Plano', projetoNome: 'Projeto', demandaNome: null, versao: 3, descricaoTecnica: texto.tecnica ?? 'Um. Dois. Três.', descricaoCliente: texto.cliente ?? 'Cliente.', documentacao: texto.documentacao ?? null };
  const gravacoes: Array<Record<string, unknown>> = [];
  const servico = {
    recuperar: async (_dto: unknown, usuario: { tipo: TipoUsuarioEnum }) => {
      const { descricaoCliente, ...semCliente } = plano;
      return { dados: usuario.tipo === TipoUsuarioEnum.DESENVOLVEDOR ? semCliente : { ...semCliente, descricaoCliente } };
    },
    alterar: async (dto: Record<string, unknown>) => {
      gravacoes.push(dto);
      plano.versao += 1;
      return { dados: { id: 7, versao: plano.versao } };
    },
  };
  return { servico: servico as unknown as PlanoService, plano, gravacoes };
}

test('consultar_plano devolve as abas e a versão de agora; a descrição do cliente nem aparece para o desenvolvedor', async () => {
  const ferramenta = new ConsultarPlanoFerramenta(criarPlanoService().servico);
  assert.equal(ferramenta.somentePlanejamento, true);
  assert.equal(ferramenta.tipo, 'LEITURA');

  const paraDev = (await ferramenta.executar({ planoId: 7 }, DESENVOLVEDOR)) as Record<string, unknown>;
  assert.equal(paraDev['versao'], 3);
  assert.equal(paraDev['descricaoTecnica'], 'Um. Dois. Três.');
  assert.equal('descricaoCliente' in paraDev, false);

  const paraGestor = (await ferramenta.executar({ planoId: 7 }, GESTOR)) as Record<string, unknown>;
  assert.equal(paraGestor['descricaoCliente'], 'Cliente.');
});

test('escrever_no_plano substitui o texto da aba com a versão lida e devolve a versão nova', async () => {
  const { servico, gravacoes } = criarPlanoService();
  const resultado = (await new EscreverNoPlanoFerramenta(servico).executar(
    { planoId: 7, aba: PlanoAbaEnum.DOCUMENTACAO, modo: 'SUBSTITUIR', texto: '# Documento novo', versao: 3 },
    DESENVOLVEDOR,
  )) as Record<string, unknown>;

  assert.deepEqual(gravacoes, [{ id: 7, versao: 3, documentacao: '# Documento novo' }]);
  assert.equal(resultado['versao'], 4);
});

test('escrever_no_plano acrescenta no fim, separando por uma linha em branco, e numa aba vazia só escreve', async () => {
  const { servico, gravacoes } = criarPlanoService();
  const ferramenta = new EscreverNoPlanoFerramenta(servico);
  await ferramenta.executar({ planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, modo: 'ACRESCENTAR', texto: 'Quatro.', versao: 3 }, DESENVOLVEDOR);
  await ferramenta.executar({ planoId: 7, aba: PlanoAbaEnum.DOCUMENTACAO, modo: 'ACRESCENTAR', texto: 'Começo.', versao: 4 }, DESENVOLVEDOR);
  assert.deepEqual(gravacoes, [
    { id: 7, versao: 3, descricaoTecnica: 'Um. Dois. Três.\n\nQuatro.' },
    { id: 7, versao: 4, documentacao: 'Começo.' },
  ]);
});

test('escrever_no_plano sobre versão antiga é recusada com o motivo e a versão atual, e não grava', async () => {
  const { servico, gravacoes } = criarPlanoService();
  await assert.rejects(
    () => new EscreverNoPlanoFerramenta(servico).executar({ planoId: 7, aba: PlanoAbaEnum.DOCUMENTACAO, modo: 'SUBSTITUIR', texto: 'x', versao: 1 }, DESENVOLVEDOR),
    (erro: ConflictException) => erro instanceof ConflictException && JSON.stringify(erro.getResponse()).includes('versão atual: 3'),
  );
  assert.deepEqual(gravacoes, []);
});

test('escrever_no_plano: o desenvolvedor nunca escreve na descrição do cliente; o gestor escreve', async () => {
  const { servico, gravacoes } = criarPlanoService();
  const ferramenta = new EscreverNoPlanoFerramenta(servico);
  const entrada = { planoId: 7, aba: PlanoAbaEnum.DESCRICAO_CLIENTE, modo: 'SUBSTITUIR' as const, texto: 'Para o cliente.', versao: 3 };
  await assert.rejects(() => ferramenta.executar(entrada, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(gravacoes, []);
  await ferramenta.executar(entrada, GESTOR);
  assert.deepEqual(gravacoes, [{ id: 7, versao: 3, descricaoCliente: 'Para o cliente.' }]);
});

test('escrever_no_plano recusa texto em branco', async () => {
  await assert.rejects(
    () => new EscreverNoPlanoFerramenta(criarPlanoService().servico).executar({ planoId: 7, aba: PlanoAbaEnum.DOCUMENTACAO, modo: 'SUBSTITUIR', texto: '   ', versao: 3 }, DESENVOLVEDOR),
    BusinessException,
  );
});

function criarProposta(texto?: Parameters<typeof criarPlanoService>[0]) {
  const criadas: Array<Record<string, unknown>> = [];
  const propostaIaService = {
    criarComAutonomia: async (dto: { dados: Record<string, unknown>; tipo: TipoPropostaIaEnum }) => {
      criadas.push(dto as never);
      return { id: 55, status: StatusPropostaIaEnum.PENDENTE };
    },
  };
  const ferramenta = new ProporAlterarTrechoDoPlanoFerramenta(propostaIaService as unknown as PropostaIaService, criarPlanoService(texto).servico);
  return { ferramenta, criadas };
}

test('propor_alterar_trecho_do_plano cria a proposta pendente com o trecho, a aba, a versão lida e o título', async () => {
  const { ferramenta, criadas } = criarProposta();
  assert.equal(ferramenta.somentePlanejamento, true);
  assert.equal(ferramenta.tipoProposta, TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO);

  const resultado = (await ferramenta.executar({ planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Dois.', trechoNovo: 'Dois, melhor.' }, DESENVOLVEDOR)) as Record<string, unknown>;

  assert.equal(resultado['propostaId'], 55);
  assert.deepEqual(criadas[0], {
    usuarioId: 1,
    tipo: TipoPropostaIaEnum.ALTERAR_TRECHO_PLANO,
    dados: { planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Dois.', trechoNovo: 'Dois, melhor.', versao: 3, planoTitulo: 'Plano' },
  });
});

test('propor_alterar_trecho_do_plano não cria proposta com o trecho ausente, repetido, igual ao novo ou na aba vedada', async () => {
  const entrada = { planoId: 7, aba: PlanoAbaEnum.DESCRICAO_TECNICA, trechoAntigo: 'Dois.', trechoNovo: 'Outro.' };
  const ausente = criarProposta();
  await assert.rejects(() => ausente.ferramenta.executar({ ...entrada, trechoAntigo: 'Não existe.' }, DESENVOLVEDOR), comMotivo(/não está no texto/));
  const repetido = criarProposta({ tecnica: 'Dois. Dois.' });
  await assert.rejects(() => repetido.ferramenta.executar(entrada, DESENVOLVEDOR), comMotivo(/aparece 2 vezes/));
  const igual = criarProposta();
  await assert.rejects(() => igual.ferramenta.executar({ ...entrada, trechoNovo: 'Dois.' }, DESENVOLVEDOR), BusinessException);
  const vedada = criarProposta();
  await assert.rejects(() => vedada.ferramenta.executar({ ...entrada, aba: PlanoAbaEnum.DESCRICAO_CLIENTE, trechoAntigo: 'Cliente.' }, DESENVOLVEDOR), UnauthorizedAccessException);
  for (const cenario of [ausente, repetido, igual, vedada]) assert.deepEqual(cenario.criadas, []);
});
