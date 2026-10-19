import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PropostaIaCriarDto, PropostaIaResumoDto, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ExecutorPropostaIa, ExecutorPropostaIaRegistro } from '../domain/executor-proposta-ia';
import { PropostaIaRepository, PropostaIaTransicao } from '../repositories/proposta-ia.repository';
import { PropostaIaService } from './proposta-ia.service';

const DONO = { sub: 1, login: 'dono', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const OUTRO = { sub: 2, login: 'outro', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const ADMINISTRADOR = { sub: 3, login: 'admin', tipo: TipoUsuarioEnum.ADMINISTRADOR } as never;
const TIPO = TipoPropostaIaEnum.CRIAR_ATIVIDADE;

/** `HttpException.message` não traz o texto da resposta; o texto do usuário está em `getResponse().mensagem`. */
const mensagemDe = (erro: unknown): string => ((erro as BusinessException).getResponse() as { mensagem: string }).mensagem;

/** Repositório em memória com o mesmo comparar-e-trocar do SQL: a troca só vale se a situação atual está em `de`. */
function criarRepositorio() {
  const propostas: PropostaIaResumoDto[] = [];
  const repositorio = {
    async criar(dto: PropostaIaCriarDto) {
      const proposta: PropostaIaResumoDto = {
        id: propostas.length + 1,
        usuarioId: dto.usuarioId,
        tipo: dto.tipo,
        status: StatusPropostaIaEnum.PENDENTE,
        dados: dto.dados,
        resultado: null,
        resolucaoData: null,
        createdDate: new Date(),
      };
      propostas.push(proposta);
      return proposta;
    },
    async recuperarPorId(id: number) {
      const encontrada = propostas.find((proposta) => proposta.id === id);
      return encontrada ? { ...encontrada } : undefined;
    },
    async listarPendentesDoUsuario(usuarioId: number) {
      return propostas.filter((proposta) => proposta.usuarioId === usuarioId && proposta.status === StatusPropostaIaEnum.PENDENTE).map((proposta) => ({ ...proposta }));
    },
    async transitar(transicao: PropostaIaTransicao) {
      const proposta = propostas.find((item) => item.id === transicao.id && item.usuarioId === transicao.usuarioId);
      if (!proposta || !transicao.de.includes(proposta.status)) return undefined;
      proposta.status = transicao.para;
      if (transicao.dados) proposta.dados = transicao.dados;
      proposta.resolucaoData = transicao.para === StatusPropostaIaEnum.PENDENTE ? null : new Date();
      return { ...proposta };
    },
    async registrarResultado(id: number, resultado: Record<string, unknown>) {
      const proposta = propostas.find((item) => item.id === id)!;
      proposta.resultado = resultado;
      return { ...proposta };
    },
  };
  return { repositorio, propostas };
}

function criarExecutor(opcoes: { falharAoExecutar?: boolean; falharAoDesfazer?: boolean; atraso?: boolean; obsoleta?: boolean | 'falha' } = {}) {
  const chamadas = { executar: [] as Record<string, unknown>[], desfazer: 0 };
  const executor: ExecutorPropostaIa = {
    tipo: TIPO,
    validar(dados) {
      if (typeof dados['nome'] !== 'string') throw new BusinessException('Informe o nome');
    },
    async executar(dados) {
      chamadas.executar.push(dados);
      if (opcoes.atraso) await new Promise((resolver) => setTimeout(resolver, 20));
      if (opcoes.falharAoExecutar) throw new BusinessException('Já existe uma execução ativa');
      return { atividadeId: 99 };
    },
    async estaObsoleta() {
      if (opcoes.obsoleta === 'falha') throw new Error('não deu para avaliar');
      return opcoes.obsoleta === true;
    },
    async desfazer() {
      chamadas.desfazer++;
      if (opcoes.falharAoDesfazer) throw new BusinessException('A atividade já foi alterada');
    },
  };
  return { executor, chamadas };
}

function criarServico(opcoesExecutor: Parameters<typeof criarExecutor>[0] = {}, registrarExecutor = true) {
  const { repositorio, propostas } = criarRepositorio();
  const registro = new ExecutorPropostaIaRegistro();
  const { executor, chamadas } = criarExecutor(opcoesExecutor);
  if (registrarExecutor) registro.registrar(executor);
  const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
  const servico = new PropostaIaService(repositorio as unknown as PropostaIaRepository, registro, configService);
  return { servico, propostas, chamadas };
}

const DADOS = { nome: 'Corrigir login' };

test('confirmar executa a ação uma vez e guarda o resultado', async () => {
  const { servico, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  const resposta = await servico.confirmar(criada.id, DONO);
  assert.equal(resposta.dados.status, StatusPropostaIaEnum.CONFIRMADA);
  assert.deepEqual(resposta.dados.resultado, { atividadeId: 99 });
  assert.equal(chamadas.executar.length, 1);
  assert.notEqual(resposta.dados.resolucaoData, null);
});

test('duas confirmações simultâneas executam a ação uma só vez e a outra recebe 409', async () => {
  const { servico, chamadas } = criarServico({ atraso: true });
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  const resultados = await Promise.allSettled([servico.confirmar(criada.id, DONO), servico.confirmar(criada.id, DONO)]);
  assert.equal(resultados.filter((resultado) => resultado.status === 'fulfilled').length, 1);
  const rejeitada = resultados.find((resultado) => resultado.status === 'rejected') as PromiseRejectedResult;
  assert.ok(rejeitada.reason instanceof ConflictException);
  assert.equal(chamadas.executar.length, 1);
});

test('executor que falha devolve a proposta a PENDENTE e propaga o motivo', async () => {
  const { servico, propostas } = criarServico({ falharAoExecutar: true });
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  await assert.rejects(servico.confirmar(criada.id, DONO), (erro) => erro instanceof BusinessException && /execução ativa/.test(mensagemDe(erro)));
  assert.equal(propostas[0].status, StatusPropostaIaEnum.PENDENTE);
  assert.equal(propostas[0].resolucaoData, null);
});

test('ajustar executa com os dados novos e marca AJUSTADA', async () => {
  const { servico, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  const resposta = await servico.ajustar(criada.id, { dados: { nome: 'Corrigir logout' } }, DONO);
  assert.equal(resposta.dados.status, StatusPropostaIaEnum.AJUSTADA);
  assert.deepEqual(chamadas.executar[0], { nome: 'Corrigir logout' });
  assert.deepEqual(resposta.dados.dados, { nome: 'Corrigir logout' });
});

test('ajustar com dados inválidos recusa antes de tirar a proposta de PENDENTE', async () => {
  const { servico, propostas, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  await assert.rejects(servico.ajustar(criada.id, { dados: { nome: 5 } }, DONO), BusinessException);
  assert.equal(propostas[0].status, StatusPropostaIaEnum.PENDENTE);
  assert.equal(chamadas.executar.length, 0);
});

test('recusar não executa e uma recusada não pode ser confirmada', async () => {
  const { servico, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  const recusada = await servico.recusar(criada.id, DONO);
  assert.equal(recusada.dados.status, StatusPropostaIaEnum.EXPIRADA);
  await assert.rejects(servico.confirmar(criada.id, DONO), ConflictException);
  assert.equal(chamadas.executar.length, 0);
});

test('desfazer só depois de confirmar, aplica a ação inversa e marca DESFEITA', async () => {
  const { servico, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  await assert.rejects(servico.desfazer(criada.id, DONO), BusinessException);
  await servico.confirmar(criada.id, DONO);
  const desfeita = await servico.desfazer(criada.id, DONO);
  assert.equal(desfeita.dados.status, StatusPropostaIaEnum.DESFEITA);
  assert.equal(chamadas.desfazer, 1);
  await assert.rejects(servico.desfazer(criada.id, DONO), BusinessException);
});

test('desfazer só vale nos 30 minutos depois de resolvida (task 194): fora do prazo é recusado e a ação inversa não roda', async () => {
  const { servico, propostas, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  await servico.confirmar(criada.id, DONO);
  propostas[0].resolucaoData = new Date(Date.now() - 31 * 60_000);
  await assert.rejects(servico.desfazer(criada.id, DONO), (erro) => erro instanceof BusinessException && /prazo de 30 minutos/.test(mensagemDe(erro)));
  assert.equal(chamadas.desfazer, 0);
  assert.equal(propostas[0].status, StatusPropostaIaEnum.CONFIRMADA);

  propostas[0].resolucaoData = new Date(Date.now() - 29 * 60_000);
  const desfeita = await servico.desfazer(criada.id, DONO);
  assert.equal(desfeita.dados.status, StatusPropostaIaEnum.DESFEITA);
  assert.equal(chamadas.desfazer, 1);
});

test('desfazer que o executor recusa mantém a proposta como estava', async () => {
  const { servico, propostas } = criarServico({ falharAoDesfazer: true });
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  await servico.ajustar(criada.id, { dados: { nome: 'Outra' } }, DONO);
  await assert.rejects(servico.desfazer(criada.id, DONO), (erro) => erro instanceof BusinessException && /já foi alterada/.test(mensagemDe(erro)));
  assert.equal(propostas[0].status, StatusPropostaIaEnum.AJUSTADA);
});

test('só o dono resolve: outro usuário e o administrador levam 403', async () => {
  const { servico, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  for (const intruso of [OUTRO, ADMINISTRADOR]) {
    await assert.rejects(servico.confirmar(criada.id, intruso), UnauthorizedAccessException);
    await assert.rejects(servico.ajustar(criada.id, { dados: DADOS }, intruso), UnauthorizedAccessException);
    await assert.rejects(servico.recusar(criada.id, intruso), UnauthorizedAccessException);
    await assert.rejects(servico.desfazer(criada.id, intruso), UnauthorizedAccessException);
    await assert.rejects(servico.recuperarPorId(criada.id, intruso), UnauthorizedAccessException);
  }
  assert.equal(chamadas.executar.length, 0);
});

test('proposta pendente de dia anterior expira ao ser lida e não pode mais ser confirmada', async () => {
  const { servico, propostas, chamadas } = criarServico();
  const criada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  propostas[0].createdDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const lida = await servico.recuperarPorId(criada.id, DONO);
  assert.equal(lida.dados.status, StatusPropostaIaEnum.EXPIRADA);
  await assert.rejects(servico.confirmar(criada.id, DONO), ConflictException);
  assert.equal(chamadas.executar.length, 0);
});

test('tipo sem executor: não cria nem executa, com erro claro', async () => {
  const { servico } = criarServico({}, false);
  await assert.rejects(servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS }), (erro) => erro instanceof BusinessException && /não está disponível/.test(mensagemDe(erro)));
});

test('criar valida os dados no executor', async () => {
  const { servico, propostas } = criarServico();
  await assert.rejects(servico.criar({ usuarioId: 1, tipo: TIPO, dados: { nome: 1 } }), BusinessException);
  assert.equal(propostas.length, 0);
});

test('registrar dois executores do mesmo tipo é erro de programação', () => {
  const registro = new ExecutorPropostaIaRegistro();
  registro.registrar(criarExecutor().executor);
  assert.throws(() => registro.registrar(criarExecutor().executor), /Já existe um executor/);
});

test('proposta inexistente devolve 404', async () => {
  const { servico } = criarServico();
  await assert.rejects(servico.confirmar(999, DONO), (erro: { getStatus?: () => number }) => erro.getStatus?.() === 404);
});

test('expirar obsoletas: só as pendentes do usuário que o executor diz obsoletas expiram', async () => {
  const { servico, propostas } = criarServico({ obsoleta: true });
  const minha = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  const dosOutros = await servico.criar({ usuarioId: 2, tipo: TIPO, dados: DADOS });
  const jaConfirmada = await servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  await servico.confirmar(jaConfirmada.id, DONO);

  assert.equal(await servico.expirarObsoletas(DONO), 1);
  assert.equal(propostas.find((proposta) => proposta.id === minha.id)?.status, StatusPropostaIaEnum.EXPIRADA);
  assert.equal(propostas.find((proposta) => proposta.id === dosOutros.id)?.status, StatusPropostaIaEnum.PENDENTE);
  assert.equal(propostas.find((proposta) => proposta.id === jaConfirmada.id)?.status, StatusPropostaIaEnum.CONFIRMADA);
});

test('expirar obsoletas: proposta que ainda vale fica pendente e uma que não dá para avaliar também', async () => {
  const valendo = criarServico({ obsoleta: false });
  await valendo.servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  assert.equal(await valendo.servico.expirarObsoletas(DONO), 0);
  assert.equal(valendo.propostas[0].status, StatusPropostaIaEnum.PENDENTE);

  const falhando = criarServico({ obsoleta: 'falha' });
  await falhando.servico.criar({ usuarioId: 1, tipo: TIPO, dados: DADOS });
  assert.equal(await falhando.servico.expirarObsoletas(DONO), 0);
  assert.equal(falhando.propostas[0].status, StatusPropostaIaEnum.PENDENTE);
});
