import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { PropostaIaCriarDto, PropostaIaGrupoSituacaoEnum, PropostaIaResumoDto, StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { ConfiguracaoIaService } from '../../configuracao-ia/services/configuracao-ia.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ConflictException } from '../../../core/exceptions/conflict.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
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
        aplicadaPelaIa: dto.aplicadaPelaIa === true,
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

/** A configuração da IA com os níveis dados (sem eles, o padrão do `shared`); `indisponivel` simula o banco fora do ar. */
function criarConfiguracao(niveis: Record<string, string> = {}, indisponivel = false) {
  return {
    obterAtiva: async () => {
      if (indisponivel) throw new Error('banco fora do ar');
      return { niveisProposta: niveis };
    },
  } as unknown as ConfiguracaoIaService;
}

function criarServico(opcoesExecutor: Parameters<typeof criarExecutor>[0] = {}, registrarExecutor = true, configuracao = criarConfiguracao()) {
  const { repositorio, propostas } = criarRepositorio();
  const registro = new ExecutorPropostaIaRegistro();
  const { executor, chamadas } = criarExecutor(opcoesExecutor);
  if (registrarExecutor) registro.registrar(executor);
  const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
  const servico = new PropostaIaService(repositorio as unknown as PropostaIaRepository, registro, configService, configuracao);
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

// Grupo de propostas (task 227): confirmar, recusar e desfazer várias de uma vez, cada uma com a regra de sempre.
function criarServicoDeGrupo() {
  const { repositorio, propostas } = criarRepositorio();
  const registro = new ExecutorPropostaIaRegistro();
  const ordem: string[] = [];
  const atividade: ExecutorPropostaIa = {
    tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE,
    validar() {},
    async executar(dados) {
      ordem.push(`executar:${String(dados['nome'])}`);
      if (dados['falhar']) throw new BusinessException(String(dados['falhar']));
      if (dados['explodir']) throw new Error('bug interno');
      return { nome: dados['nome'], naoDesfaz: dados['naoDesfaz'] ?? false };
    },
    async desfazer(resultado) {
      ordem.push(`desfazer:${String(resultado['nome'])}`);
      if (resultado['naoDesfaz']) throw new BusinessException('A atividade já foi alterada');
    },
  };
  const demanda: ExecutorPropostaIa = {
    tipo: TipoPropostaIaEnum.CRIAR_DEMANDA,
    validar() {},
    async executar(dados) {
      ordem.push(`executar:${String(dados['nome'])}`);
      if (dados['falhar']) throw new BusinessException(String(dados['falhar']));
      return { demandaId: 5, nome: dados['nome'] };
    },
    async desfazer(resultado) {
      ordem.push(`desfazer:${String(resultado['nome'])}`);
    },
  };
  registro.registrar(atividade);
  registro.registrar(demanda);
  const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
  const servico = new PropostaIaService(repositorio as unknown as PropostaIaRepository, registro, configService, criarConfiguracao());
  const criarAtividade = (nome: string, extras: Record<string, unknown> = {}, usuarioId = 1) =>
    servico.criar({ usuarioId, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE, dados: { nome, ...extras } });
  const criarDemanda = (nome: string, extras: Record<string, unknown> = {}) =>
    servico.criar({ usuarioId: 1, tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, dados: { nome, ...extras } });
  return { servico, propostas, ordem, criarAtividade, criarDemanda };
}

const situacoesDe = (itens: { propostaId: number; situacao: PropostaIaGrupoSituacaoEnum }[]) => itens.map((item) => `${item.propostaId}:${item.situacao}`);

test('confirmar o grupo executa na ordem em que as propostas nasceram, mesmo com os ids fora de ordem', async () => {
  const { servico, ordem, criarAtividade, criarDemanda } = criarServicoDeGrupo();
  const demanda = await criarDemanda('Demanda');
  const primeira = await criarAtividade('A1');
  const segunda = await criarAtividade('A2');
  const resposta = await servico.confirmarGrupo({ propostaIds: [segunda.id, demanda.id, primeira.id] }, DONO);
  assert.deepEqual(ordem, ['executar:Demanda', 'executar:A1', 'executar:A2']);
  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${demanda.id}:RESOLVIDA`, `${primeira.id}:RESOLVIDA`, `${segunda.id}:RESOLVIDA`]);
  assert.ok(resposta.dados.itens.every((item) => item.proposta?.status === StatusPropostaIaEnum.CONFIRMADA && item.motivo === null));
});

test('quando uma falha, as que dependem dela ficam pendentes com o motivo e as independentes seguem', async () => {
  const { servico, ordem, propostas, criarAtividade, criarDemanda } = criarServicoDeGrupo();
  const estrutura = await criarDemanda('Estrutura', { falhar: 'O projeto não aceita' });
  const filha = await criarDemanda('Filha', { demandaPaiPropostaId: estrutura.id });
  const neta = await criarDemanda('Neta', { demandaPaiPropostaId: filha.id });
  const independente = await criarAtividade('Independente');
  const resposta = await servico.confirmarGrupo({ propostaIds: [estrutura.id, filha.id, neta.id, independente.id] }, DONO);

  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${estrutura.id}:FALHOU`, `${filha.id}:BLOQUEADA`, `${neta.id}:BLOQUEADA`, `${independente.id}:RESOLVIDA`]);
  assert.equal(resposta.dados.itens[0].motivo, 'O projeto não aceita');
  assert.equal(resposta.dados.itens[1].motivo, 'Depende de uma proposta do grupo que não foi confirmada');
  assert.equal(resposta.dados.itens[2].motivo, 'Depende de uma proposta do grupo que não foi confirmada');
  assert.deepEqual(ordem, ['executar:Estrutura', 'executar:Independente'], 'a dependente nem chegou a executar');
  // A que falhou volta a pendente, as bloqueadas nunca saíram dela, e o item traz a proposta como ficou.
  assert.deepEqual(
    propostas.map((proposta) => proposta.status),
    [StatusPropostaIaEnum.PENDENTE, StatusPropostaIaEnum.PENDENTE, StatusPropostaIaEnum.PENDENTE, StatusPropostaIaEnum.CONFIRMADA],
  );
  assert.equal(resposta.dados.itens[1].proposta?.status, StatusPropostaIaEnum.PENDENTE);
});

test('a falha de uma proposta independente não impede as outras', async () => {
  const { servico, criarAtividade } = criarServicoDeGrupo();
  const boa = await criarAtividade('Boa');
  const ruim = await criarAtividade('Ruim', { falhar: 'Já existe uma execução ativa' });
  const outra = await criarAtividade('Outra');
  const resposta = await servico.confirmarGrupo({ propostaIds: [boa.id, ruim.id, outra.id] }, DONO);
  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${boa.id}:RESOLVIDA`, `${ruim.id}:FALHOU`, `${outra.id}:RESOLVIDA`]);
  assert.equal(resposta.dados.itens[1].motivo, 'Já existe uma execução ativa');
});

test('erro inesperado numa proposta vira um motivo genérico, sem vazar a mensagem, e o grupo segue', async () => {
  const { servico, criarAtividade } = criarServicoDeGrupo();
  const quebrada = await criarAtividade('Quebrada', { explodir: true });
  const normal = await criarAtividade('Normal');
  const resposta = await servico.confirmarGrupo({ propostaIds: [quebrada.id, normal.id] }, DONO);
  assert.equal(resposta.dados.itens[0].situacao, PropostaIaGrupoSituacaoEnum.FALHOU);
  assert.equal(resposta.dados.itens[0].motivo, 'Não foi possível concluir esta proposta');
  assert.equal(resposta.dados.itens[1].situacao, PropostaIaGrupoSituacaoEnum.RESOLVIDA);
});

test('proposta já resolvida no grupo falha com o motivo e não repete a ação', async () => {
  const { servico, ordem, criarAtividade } = criarServicoDeGrupo();
  const feita = await criarAtividade('Feita');
  const nova = await criarAtividade('Nova');
  await servico.confirmar(feita.id, DONO);
  const resposta = await servico.confirmarGrupo({ propostaIds: [feita.id, nova.id] }, DONO);
  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${feita.id}:FALHOU`, `${nova.id}:RESOLVIDA`]);
  assert.equal(resposta.dados.itens[0].motivo, 'A proposta já foi resolvida');
  assert.deepEqual(ordem, ['executar:Feita', 'executar:Nova']);
});

test('proposta de outro usuário no grupo recusa tudo antes de executar qualquer uma', async () => {
  const { servico, ordem, propostas, criarAtividade } = criarServicoDeGrupo();
  const minha = await criarAtividade('Minha');
  const alheia = await criarAtividade('Alheia', {}, 2);
  await assert.rejects(servico.confirmarGrupo({ propostaIds: [minha.id, alheia.id] }, DONO), UnauthorizedAccessException);
  await assert.rejects(servico.recusarGrupo({ propostaIds: [minha.id, alheia.id] }, DONO), UnauthorizedAccessException);
  assert.deepEqual(ordem, []);
  assert.ok(propostas.every((proposta) => proposta.status === StatusPropostaIaEnum.PENDENTE));
  await assert.rejects(servico.confirmarGrupo({ propostaIds: [minha.id, 9999] }, DONO), ResourceNotFoundException);
});

test('recusar o grupo recusa todas sem executar nada; a que já foi resolvida falha sem impedir as outras', async () => {
  const { servico, ordem, propostas, criarAtividade } = criarServicoDeGrupo();
  const primeira = await criarAtividade('A1');
  const segunda = await criarAtividade('A2');
  const terceira = await criarAtividade('A3');
  await servico.confirmar(segunda.id, DONO);
  ordem.length = 0;
  const resposta = await servico.recusarGrupo({ propostaIds: [primeira.id, segunda.id, terceira.id] }, DONO);
  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${primeira.id}:RESOLVIDA`, `${segunda.id}:FALHOU`, `${terceira.id}:RESOLVIDA`]);
  assert.equal(resposta.dados.itens[1].motivo, 'A proposta já foi resolvida');
  assert.deepEqual(ordem, []);
  assert.deepEqual(propostas.map((proposta) => proposta.status), [StatusPropostaIaEnum.EXPIRADA, StatusPropostaIaEnum.CONFIRMADA, StatusPropostaIaEnum.EXPIRADA]);
});

test('desfazer o grupo desfaz na ordem inversa', async () => {
  const { servico, ordem, criarAtividade, criarDemanda } = criarServicoDeGrupo();
  const demanda = await criarDemanda('Demanda');
  const primeira = await criarAtividade('A1');
  const segunda = await criarAtividade('A2');
  await servico.confirmarGrupo({ propostaIds: [demanda.id, primeira.id, segunda.id] }, DONO);
  ordem.length = 0;
  const resposta = await servico.desfazerGrupo({ propostaIds: [demanda.id, primeira.id, segunda.id] }, DONO);
  assert.deepEqual(ordem, ['desfazer:A2', 'desfazer:A1', 'desfazer:Demanda']);
  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${segunda.id}:RESOLVIDA`, `${primeira.id}:RESOLVIDA`, `${demanda.id}:RESOLVIDA`]);
  assert.ok(resposta.dados.itens.every((item) => item.proposta?.status === StatusPropostaIaEnum.DESFEITA));
});

test('desfazer o grupo para na primeira que recusa e deixa as outras como estavam, bloqueadas', async () => {
  const { servico, ordem, propostas, criarAtividade, criarDemanda } = criarServicoDeGrupo();
  const demanda = await criarDemanda('Demanda');
  const primeira = await criarAtividade('A1', { naoDesfaz: true });
  const segunda = await criarAtividade('A2');
  await servico.confirmarGrupo({ propostaIds: [demanda.id, primeira.id, segunda.id] }, DONO);
  ordem.length = 0;
  const resposta = await servico.desfazerGrupo({ propostaIds: [demanda.id, primeira.id, segunda.id] }, DONO);
  assert.deepEqual(situacoesDe(resposta.dados.itens), [`${segunda.id}:RESOLVIDA`, `${primeira.id}:FALHOU`, `${demanda.id}:BLOQUEADA`]);
  assert.equal(resposta.dados.itens[1].motivo, 'A atividade já foi alterada');
  assert.equal(resposta.dados.itens[2].motivo, 'Não foi desfeita: A atividade já foi alterada');
  assert.deepEqual(ordem, ['desfazer:A2', 'desfazer:A1'], 'a demanda nem foi tentada');
  assert.deepEqual(propostas.map((proposta) => proposta.status), [StatusPropostaIaEnum.CONFIRMADA, StatusPropostaIaEnum.CONFIRMADA, StatusPropostaIaEnum.DESFEITA]);
});

test('o grupo com o mesmo id repetido não executa duas vezes', async () => {
  const { servico, ordem, criarAtividade } = criarServicoDeGrupo();
  const unica = await criarAtividade('Única');
  const resposta = await servico.confirmarGrupo({ propostaIds: [unica.id, unica.id] }, DONO);
  assert.equal(resposta.dados.itens.length, 1);
  assert.deepEqual(ordem, ['executar:Única']);
});

// --- Autonomia da IA (task 228) ---

test('autonomia: no nível "Faz e avisa" a proposta é criada e confirmada na hora, marcada como aplicada pela IA', async () => {
  const { servico, chamadas } = criarServico();
  const proposta = await servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: DADOS }, DONO);
  assert.equal(proposta.status, StatusPropostaIaEnum.CONFIRMADA);
  assert.equal(proposta.aplicadaPelaIa, true);
  assert.deepEqual(proposta.resultado, { atividadeId: 99 });
  assert.equal(chamadas.executar.length, 1, 'o executor roda uma vez, com os dados da proposta');
  assert.deepEqual(chamadas.executar[0], DADOS);
});

test('autonomia: no nível "Pergunta" a proposta fica pendente e nada é executado', async () => {
  const { servico, chamadas } = criarServico({}, true, criarConfiguracao({ [TIPO]: 'PERGUNTA' }));
  const proposta = await servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: DADOS }, DONO);
  assert.equal(proposta.status, StatusPropostaIaEnum.PENDENTE);
  assert.equal(proposta.aplicadaPelaIa, false);
  assert.equal(chamadas.executar.length, 0);
});

test('autonomia: em nome de outra pessoa sempre pergunta, mesmo com o tipo em "Faz e avisa"', async () => {
  const { servico, chamadas } = criarServico({}, true, criarConfiguracao({ [TIPO]: 'FAZ_E_AVISA' }));
  const proposta = await servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: { ...DADOS, usuarioId: 2 } }, DONO);
  assert.equal(proposta.status, StatusPropostaIaEnum.PENDENTE);
  assert.equal(proposta.aplicadaPelaIa, false);
  assert.equal(chamadas.executar.length, 0);
});

test('autonomia: sem a configuração da IA, a IA pergunta em vez de agir', async () => {
  const { servico, chamadas } = criarServico({}, true, criarConfiguracao({}, true));
  const proposta = await servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: DADOS }, DONO);
  assert.equal(proposta.status, StatusPropostaIaEnum.PENDENTE);
  assert.equal(chamadas.executar.length, 0);
});

test('autonomia: falha do executor volta ao modelo como erro com o motivo e a proposta não fica pendente', async () => {
  const { servico, propostas, chamadas } = criarServico({ falharAoExecutar: true });
  await assert.rejects(
    () => servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: DADOS }, DONO),
    (erro: unknown) => erro instanceof BusinessException && /Já existe uma execução ativa/.test(mensagemDe(erro)) && /Nada foi alterado/.test(mensagemDe(erro)),
  );
  assert.equal(chamadas.executar.length, 1);
  assert.equal(propostas[0].status, StatusPropostaIaEnum.EXPIRADA, 'não sobra cartão pendente de uma ação que a IA tentou e não conseguiu');
});

test('autonomia: dados que o executor recusa não criam proposta nenhuma', async () => {
  const { servico, propostas } = criarServico();
  await assert.rejects(() => servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: {} }, DONO), BusinessException);
  assert.equal(propostas.length, 0);
});

test('autonomia: a proposta feita pela IA se desfaz como a confirmada no cartão, dentro do prazo', async () => {
  const { servico, chamadas } = criarServico();
  const proposta = await servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: DADOS }, DONO);
  const desfeita = await servico.desfazer(proposta.id, DONO);
  assert.equal(desfeita.dados.status, StatusPropostaIaEnum.DESFEITA);
  assert.equal(chamadas.desfazer, 1);
});

test('autonomia: desfazer recusado porque o estado mudou depois deixa a proposta feita como estava', async () => {
  const { servico, propostas } = criarServico({ falharAoDesfazer: true });
  const proposta = await servico.criarComAutonomia({ usuarioId: 1, tipo: TIPO, dados: DADOS }, DONO);
  await assert.rejects(() => servico.desfazer(proposta.id, DONO), BusinessException);
  assert.equal(propostas[0].status, StatusPropostaIaEnum.CONFIRMADA);
  assert.equal(propostas[0].aplicadaPelaIa, true);
});
