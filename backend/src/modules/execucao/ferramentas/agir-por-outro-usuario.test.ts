import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { CriarAtividadeExecutor } from '../../atividade/executores/criar-atividade.executor';
import { ListarMinhasAtividadesFerramenta } from '../../atividade/ferramentas/listar-minhas-atividades.ferramenta';
import { ProporCriarAtividadeFerramenta } from '../../atividade/ferramentas/propor-criar-atividade.ferramenta';
import { AtividadeRepository } from '../../atividade/repositories/atividade.repository';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { IniciarExecucaoExecutor } from '../executores/iniciar-execucao.executor';
import { PausarExecucaoExecutor } from '../executores/pausar-execucao.executor';
import { ExecucaoRepository } from '../repositories/execucao.repository';
import { ExecucaoService } from '../services/execucao.service';
import { ConsultarExecucaoAtivaFerramenta } from './consultar-execucao-ativa.ferramenta';
import { ProporIniciarExecucaoFerramenta } from './propor-iniciar-execucao.ferramenta';
import { ProporPausarExecucaoFerramenta } from './propor-pausar-execucao.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

/** Valida que a `BusinessException` traz o texto (a mensagem fica no corpo da resposta HTTP, não em `message`). */
const contem = (texto: string) => (erro: BusinessException) => JSON.stringify(erro.getResponse()).includes(texto);

// ------------------------------------------------------------------ ExecucaoService.recuperarAtivaDoUsuario

test('recuperarAtivaDoUsuario: o gestor lê a de qualquer um e o desenvolvedor só a própria', async () => {
  const repositorio = { recuperarAtiva: async ({ usuarioId }: { usuarioId: number }) => ({ id: 50 + usuarioId, atividadeId: 9, descricao: 'x', inicioData: new Date() }) };
  const servico = new ExecucaoService(repositorio as unknown as ExecucaoRepository, {} as never, {} as never, {} as never);
  assert.equal((await servico.recuperarAtivaDoUsuario({ usuarioId: 8 }, GESTOR)).dados?.id, 58);
  assert.equal((await servico.recuperarAtivaDoUsuario({ usuarioId: 7 }, DESENVOLVEDOR)).dados?.id, 57);
  await assert.rejects(servico.recuperarAtivaDoUsuario({ usuarioId: 8 }, DESENVOLVEDOR), UnauthorizedAccessException);
});

// ------------------------------------------------------------------ criar atividade para outra pessoa

const USUARIOS: Record<number, { nomeCompleto: string; status: TipoUsuarioStatusEnum }> = {
  8: { nomeCompleto: 'Matheus Henrique', status: TipoUsuarioStatusEnum.ATIVO },
  10: { nomeCompleto: 'Caio Inativo', status: TipoUsuarioStatusEnum.INATIVO },
};

function criarFerramentaDeCriar() {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const demandaRepositorio = { recuperar: async ({ id }: { id: number }) => ({ id, nome: 'Tela de login' }), listarAncestral: async () => [] };
  const usuarioService = { recuperar: async ({ id }: { id: number }) => ({ dados: { id, ...USUARIOS[id] } }) };
  const ferramenta = new ProporCriarAtividadeFerramenta(
    propostaIaService as unknown as PropostaIaService, demandaRepositorio as unknown as DemandaRepository, usuarioService as unknown as UsuarioService,
  );
  return { ferramenta, propostas };
}

test('criar atividade: o gestor cria para outra pessoa e a proposta guarda o dono; para si mesmo o usuarioId some', async () => {
  const { ferramenta, propostas } = criarFerramentaDeCriar();
  await ferramenta.executar({ demandaId: 3, nome: 'Montar o formulário', usuarioId: 8 }, GESTOR);
  assert.deepEqual(propostas[0].dados, { demandaId: 3, nome: 'Montar o formulário', demandaNome: 'Tela de login', usuarioId: 8, usuarioNome: 'Matheus Henrique' });
  await ferramenta.executar({ demandaId: 3, nome: 'Montar o formulário', usuarioId: 1 }, GESTOR);
  assert.equal(propostas[1].dados['usuarioId'], undefined);
  assert.equal(propostas[1].dados['usuarioNome'], undefined);
});

test('criar atividade: desenvolvedor com usuarioId de outra pessoa e usuário inativo são recusados, sem proposta', async () => {
  const { ferramenta, propostas } = criarFerramentaDeCriar();
  await assert.rejects(ferramenta.executar({ demandaId: 3, nome: 'Montar o formulário', usuarioId: 8 }, DESENVOLVEDOR), contem('Só o gestor'));
  await assert.rejects(ferramenta.executar({ demandaId: 3, nome: 'Montar o formulário', usuarioId: 10 }, GESTOR), contem('inativo'));
  assert.equal(propostas.length, 0);
});

test('criar atividade: o executor passa o dono à service e recusa o desenvolvedor com usuarioId alheio', async () => {
  const criadas: Record<string, unknown>[] = [];
  const servico = { criar: async (dto: Record<string, unknown>) => { criadas.push(dto); return { dados: { id: 31 } }; } };
  const executor = new CriarAtividadeExecutor(servico as unknown as AtividadeService, {} as unknown as AtividadeRepository);
  await executor.executar({ demandaId: 3, nome: 'Montar o formulário', usuarioId: 8, usuarioNome: 'Matheus Henrique' }, GESTOR);
  assert.equal(criadas[0]['usuarioId'], 8);
  await assert.rejects(executor.executar({ demandaId: 3, nome: 'Montar o formulário', usuarioId: 8 }, DESENVOLVEDOR), BusinessException);
  assert.equal(criadas.length, 1);
});

// ------------------------------------------------------------------ iniciar e pausar por outra pessoa

interface Ativa { id: number; atividadeId: number; descricao: string; inicioData?: Date }

/** Atividade 9 do usuário 8 (Matheus) e atividade 5 também dele; execuções ativas por usuário. */
function montarCenario(ativas: Record<number, Ativa | undefined>) {
  const chamadas: string[] = [];
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const atividades: Record<number, { nome: string; demandaId: number; status: string; usuarioId: number; nomeUsuario: string }> = {
    9: { nome: 'Ajustar login', demandaId: 3, status: 'PLANEJADA', usuarioId: 8, nomeUsuario: 'Matheus Henrique' },
    5: { nome: 'Layout do carrinho', demandaId: 4, status: 'PLANEJADA', usuarioId: 8, nomeUsuario: 'Matheus Henrique' },
    6: { nome: 'Atividade do dev', demandaId: 3, status: 'PLANEJADA', usuarioId: 7, nomeUsuario: 'Dev' },
  };
  const atividadeService = {
    recuperar: async ({ id }: { id: number }) => ({ dados: { id, ...atividades[id] } }),
    alterar: async () => ({ dados: {} }),
  };
  const demandaRepositorio = { recuperar: async ({ id }: { id: number }) => ({ id, nome: id === 3 ? 'Autenticação' : 'Carrinho' }) };
  const execucaoService = {
    // A execução ativa do TOKEN e a de um usuário qualquer saem de mapas diferentes: o teste prova qual delas foi lida.
    recuperarAtiva: async (usuarioAtivo: { sub: number }) => { chamadas.push(`ativa-do-token:${usuarioAtivo.sub}`); return { dados: ativas[usuarioAtivo.sub] ?? null }; },
    recuperarAtivaDoUsuario: async ({ usuarioId }: { usuarioId: number }, usuarioAtivo: { sub: number; tipo: TipoUsuarioEnum }) => {
      if (usuarioId !== usuarioAtivo.sub && usuarioAtivo.tipo === TipoUsuarioEnum.DESENVOLVEDOR) throw new UnauthorizedAccessException();
      chamadas.push(`ativa-de:${usuarioId}`);
      return { dados: ativas[usuarioId] ?? null };
    },
    encerrar: async (dto: { id: number; descricao: string }) => { chamadas.push(`encerrar:${dto.id}:${dto.descricao}`); return { dados: {} }; },
    iniciar: async (dto: { atividadeId: number }) => { chamadas.push(`iniciar:${dto.atividadeId}`); return { dados: { id: 100 } }; },
    recuperar: async () => ({ dados: { fimData: null } }),
    excluir: async (dto: { id: number }) => { chamadas.push(`excluir:${dto.id}`); },
    alterar: async (dto: { id: number }) => { chamadas.push(`reabrir:${dto.id}`); return { dados: {} }; },
  };
  const proposta = propostaIaService as unknown as PropostaIaService;
  const atividade = atividadeService as unknown as AtividadeService;
  const demanda = demandaRepositorio as unknown as DemandaRepository;
  const execucao = execucaoService as unknown as ExecucaoService;
  return {
    chamadas, propostas,
    iniciarTool: new ProporIniciarExecucaoFerramenta(proposta, atividade, demanda, execucao),
    pausarTool: new ProporPausarExecucaoFerramenta(proposta, atividade, demanda, execucao),
    iniciarExecutor: new IniciarExecucaoExecutor(execucao, atividade),
    pausarExecutor: new PausarExecucaoExecutor(execucao),
    consultarTool: new ConsultarExecucaoAtivaFerramenta(execucao),
  };
}

const ATIVA_DO_GESTOR: Ativa = { id: 1, atividadeId: 6, descricao: 'trabalho do gestor' };
const ATIVA_DO_MATHEUS: Ativa = { id: 2, atividadeId: 5, descricao: 'Layout do carrinho', inicioData: new Date('2026-10-18T14:00:00Z') };

test('iniciar para outra pessoa: lê e pausa a execução ativa DELA, nunca a do gestor, e mostra o nome dela', async () => {
  const { iniciarTool, propostas, chamadas } = montarCenario({ 1: ATIVA_DO_GESTOR, 8: ATIVA_DO_MATHEUS });
  await iniciarTool.executar({ atividadeId: 9, descricao: 'Ajustar o login do Matheus' }, GESTOR);
  assert.deepEqual(chamadas, ['ativa-de:8']);
  assert.equal(propostas[0].dados['usuarioNome'], 'Matheus Henrique');
  assert.equal(propostas[0].dados['usuarioId'], 8, 'o dono fica nos dados: a regra de nível vê que é em nome de outra pessoa');
  assert.equal(propostas[0].dados['pausaraAtividadeNome'], 'Layout do carrinho');
});

test('iniciar a própria atividade não mostra pessoa; desenvolvedor numa atividade alheia é recusado', async () => {
  const { iniciarTool, propostas } = montarCenario({});
  await iniciarTool.executar({ atividadeId: 6, descricao: 'Trabalho do próprio gestor' }, DESENVOLVEDOR);
  assert.equal(propostas[0].dados['usuarioNome'], undefined);
  assert.equal(propostas[0].dados['usuarioId'], undefined);
  await assert.rejects(iniciarTool.executar({ atividadeId: 9, descricao: 'Ajustar o login do Matheus' }, DESENVOLVEDOR), contem('Só o gestor'));
  assert.equal(propostas.length, 1);
});

test('iniciar para outra pessoa: o executor pausa a execução dela, inicia a nova e o desfazer reabre a dela', async () => {
  const { iniciarExecutor, chamadas } = montarCenario({ 1: ATIVA_DO_GESTOR, 8: ATIVA_DO_MATHEUS });
  const resultado = await iniciarExecutor.executar({ atividadeId: 9, descricao: 'Ajustar o login do Matheus' }, GESTOR);
  assert.deepEqual(chamadas, ['ativa-de:8', 'encerrar:2:Layout do carrinho', 'iniciar:9']);
  assert.equal(resultado['donoId'], 8);
  assert.equal(resultado['pausouExecucaoId'], 2);
  chamadas.length = 0;
  // Depois do início, o Matheus não tem mais nenhuma ativa para o desfazer reabrir a anterior.
  const cenario = montarCenario({ 1: ATIVA_DO_GESTOR });
  await cenario.iniciarExecutor.desfazer(resultado, GESTOR);
  assert.deepEqual(cenario.chamadas, ['excluir:100', 'ativa-de:8', 'reabrir:2']);
});

test('iniciar para outra pessoa: obsoleta olha a execução dela, não a do gestor', async () => {
  const { iniciarExecutor } = montarCenario({ 1: { id: 1, atividadeId: 9, descricao: 'x' }, 8: undefined });
  assert.equal(await iniciarExecutor.estaObsoleta({ atividadeId: 9, descricao: 'Ajustar o login' }, GESTOR), false);
  const iniciada = montarCenario({ 8: { id: 3, atividadeId: 9, descricao: 'x' } });
  assert.equal(await iniciada.iniciarExecutor.estaObsoleta({ atividadeId: 9, descricao: 'Ajustar o login' }, GESTOR), true);
});

test('pausar a de outra pessoa: só o gestor, lê a execução dela e guarda de quem é para o desfazer', async () => {
  const { pausarTool, pausarExecutor, propostas, chamadas } = montarCenario({ 1: ATIVA_DO_GESTOR, 8: ATIVA_DO_MATHEUS });
  await pausarTool.executar({ usuarioId: 8, descricao: 'Layout do carrinho avançado' }, GESTOR);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.PAUSAR_EXECUCAO);
  assert.equal(propostas[0].dados['usuarioId'], 8);
  assert.equal(propostas[0].dados['usuarioNome'], 'Matheus Henrique');
  assert.equal(propostas[0].dados['atividadeNome'], 'Layout do carrinho');
  await assert.rejects(pausarTool.executar({ usuarioId: 8 }, DESENVOLVEDOR), contem('Só o gestor'));

  chamadas.length = 0;
  const resultado = await pausarExecutor.executar({ usuarioId: 8, descricao: 'Layout do carrinho avançado' }, GESTOR);
  assert.deepEqual(chamadas, ['ativa-de:8', 'encerrar:2:Layout do carrinho avançado']);
  assert.equal(resultado['usuarioId'], 8);
});

test('pausar a de outra pessoa: sem execução dela em andamento não há proposta; para si mesmo o usuarioId some', async () => {
  const semAtiva = montarCenario({ 1: ATIVA_DO_GESTOR });
  await assert.rejects(semAtiva.pausarTool.executar({ usuarioId: 8 }, GESTOR), contem('Essa pessoa'));
  assert.equal(semAtiva.propostas.length, 0);
  await semAtiva.pausarTool.executar({ usuarioId: 1 }, GESTOR);
  assert.equal(semAtiva.propostas[0].dados['usuarioId'], undefined);
});

test('consultar a execução ativa: o gestor lê a de outra pessoa; o desenvolvedor, nunca', async () => {
  const servicoDeListar = { listar: async () => ({ dados: { itens: [{ id: 2, nomeAtividade: 'Layout do carrinho', nomeDemanda: 'Carrinho', nomeProjeto: 'Loja', nomeUsuario: 'Matheus Henrique' }] } }) };
  const base = montarCenario({ 8: ATIVA_DO_MATHEUS }).consultarTool;
  const servico = (base as unknown as { execucaoService: Record<string, unknown> }).execucaoService;
  Object.assign(servico, servicoDeListar);
  const resultado = await base.executar({ usuarioId: 8 }, GESTOR);
  assert.equal(resultado.ativa, true);
  assert.equal(resultado.usuario, 'Matheus Henrique');
  await assert.rejects(base.executar({ usuarioId: 8 }, DESENVOLVEDOR), UnauthorizedAccessException);
});

test('listar atividades de outra pessoa: o gestor pode e o desenvolvedor é recusado', async () => {
  const filtros: Record<string, unknown>[] = [];
  const servico = { listar: async (dto: Record<string, unknown>) => { filtros.push(dto); return { dados: { itens: [], totalItens: 0 } }; } };
  const ferramenta = new ListarMinhasAtividadesFerramenta(servico as unknown as AtividadeService);
  await ferramenta.executar({ usuarioId: 8 }, GESTOR);
  assert.equal(filtros[0]['usuarioId'], 8);
  await ferramenta.executar({}, DESENVOLVEDOR);
  assert.equal(filtros[1]['usuarioId'], 7);
  await assert.rejects(ferramenta.executar({ usuarioId: 8 }, DESENVOLVEDOR), contem('Só o gestor'));
  assert.equal(filtros.length, 2);
});
