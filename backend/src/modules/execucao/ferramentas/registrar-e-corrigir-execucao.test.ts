import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecucaoAlterarDto, ExecucaoRegistrarDto, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { CorrigirExecucaoExecutor } from '../executores/corrigir-execucao.executor';
import { RegistrarExecucaoExecutor } from '../executores/registrar-execucao.executor';
import { ExecucaoRepository } from '../repositories/execucao.repository';
import { ExecucaoService } from '../services/execucao.service';
import { ProporCorrigirExecucaoFerramenta } from './propor-corrigir-execucao.ferramenta';
import { ProporRegistrarExecucaoFerramenta } from './propor-registrar-execucao.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const AGORA = new Date('2026-10-18T20:00:00Z'); // 17h em São Paulo

const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;
const atividadeService = {
  recuperar: async () => ({ dados: { id: 9, usuarioId: 7, nomeUsuario: 'Dev', nome: 'Ajustar login', demandaId: 3 } }),
} as unknown as AtividadeService;
const demandaRepositorio = { recuperar: async () => ({ id: 3, nome: 'Autenticação' }) } as unknown as DemandaRepository;

function criarFerramentas(opcoes: { sobreposicao?: boolean } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const consultasDeSobreposicao: Record<string, unknown>[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } } as unknown as PropostaIaService;
  const repositorio = { validarSobreposicao: async (dto: Record<string, unknown>) => { consultasDeSobreposicao.push(dto); return opcoes.sobreposicao ?? false; } } as unknown as ExecucaoRepository;
  const execucaoAtual = { id: 5, atividadeId: 9, descricao: 'Ajustes do login', inicioData: new Date('2026-10-17T17:00:00Z'), fimData: new Date('2026-10-17T19:00:00Z') };
  const execucaoService = { recuperar: async () => ({ dados: execucaoAtual }) } as unknown as ExecucaoService;
  class RegistrarFixa extends ProporRegistrarExecucaoFerramenta { protected agora(): Date { return AGORA; } }
  class CorrigirFixa extends ProporCorrigirExecucaoFerramenta { protected agora(): Date { return AGORA; } }
  return {
    propostas, consultasDeSobreposicao,
    registrar: new RegistrarFixa(propostaIaService, atividadeService, demandaRepositorio, repositorio, configService),
    corrigir: new CorrigirFixa(propostaIaService, execucaoService, repositorio, atividadeService, demandaRepositorio, configService),
  };
}

test('propor registrar converte dia e horas para instantes do fuso e mostra o período resolvido', async () => {
  const { registrar, propostas } = criarFerramentas();
  await registrar.executar({ atividadeId: 9, data: '2026-10-17', horaInicio: '14:00', horaFim: '16:00', descricao: 'Revisão do login' }, GESTOR);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.REGISTRAR_EXECUCAO);
  assert.equal(propostas[0].dados['inicioData'], '2026-10-17T17:00:00.000Z');
  assert.equal(propostas[0].dados['fimData'], '2026-10-17T19:00:00.000Z');
  assert.equal(propostas[0].dados['periodoTexto'], '17/10/2026, 14:00 às 16:00');
  assert.equal(propostas[0].dados['duracaoMinutos'], 120);
  assert.equal(propostas[0].dados['usuarioNome'], 'Dev');
});

test('propor registrar recusa futuro, fim antes do início e sobreposição, sem criar proposta', async () => {
  const base = { atividadeId: 9, data: '2026-10-17', descricao: 'Revisão do login' };
  const normal = criarFerramentas();
  await assert.rejects(normal.registrar.executar({ ...base, data: '2026-10-19', horaInicio: '09:00', horaFim: '10:00' }, GESTOR), BusinessException);
  await assert.rejects(normal.registrar.executar({ ...base, horaInicio: '16:00', horaFim: '14:00' }, GESTOR), BusinessException);
  const sobreposta = criarFerramentas({ sobreposicao: true });
  await assert.rejects(sobreposta.registrar.executar({ ...base, horaInicio: '14:00', horaFim: '16:00' }, GESTOR), BusinessException);
  assert.equal(normal.propostas.length + sobreposta.propostas.length, 0);
  assert.equal(sobreposta.registrar.permissao, 'GESTOR');
});

test('propor corrigir muda só o fim, no dia da execução, e guarda o período de antes', async () => {
  const { corrigir, propostas, consultasDeSobreposicao } = criarFerramentas();
  await corrigir.executar({ execucaoId: 5, horaFim: '18:00' }, DESENVOLVEDOR);
  const dados = propostas[0].dados;
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.CORRIGIR_EXECUCAO);
  assert.equal(dados['novoInicioData'], '2026-10-17T17:00:00.000Z');
  assert.equal(dados['novoFimData'], '2026-10-17T21:00:00.000Z');
  assert.equal(dados['fimAnteriorData'], '2026-10-17T19:00:00.000Z');
  assert.equal(dados['periodoAnteriorTexto'], '17/10/2026, 14:00 às 16:00');
  assert.equal(dados['periodoNovoTexto'], '17/10/2026, 14:00 às 18:00');
  assert.equal(consultasDeSobreposicao[0]['ignorarExecucaoId'], 5);
});

test('propor corrigir sem nada para corrigir, com período inválido ou sobreposto não cria proposta', async () => {
  const { corrigir, propostas } = criarFerramentas();
  await assert.rejects(corrigir.executar({ execucaoId: 5 }, DESENVOLVEDOR), BusinessException);
  await assert.rejects(corrigir.executar({ execucaoId: 5, horaFim: '13:00' }, DESENVOLVEDOR), BusinessException);
  await assert.rejects(corrigir.executar({ execucaoId: 5, data: '2026-10-20' }, DESENVOLVEDOR), BusinessException);
  const sobreposta = criarFerramentas({ sobreposicao: true });
  await assert.rejects(sobreposta.corrigir.executar({ execucaoId: 5, horaFim: '18:00' }, DESENVOLVEDOR), BusinessException);
  assert.equal(propostas.length + sobreposta.propostas.length, 0);
});

// ------------------------------------------------------------------ executores

function criarServicoDeExecucao(inicial: { inicioData: Date; fimData: Date | null; descricao: string }) {
  const execucao = { id: 5, atividadeId: 9, ...inicial };
  const chamadas: string[] = [];
  const servico = {
    registrar: async (dto: ExecucaoRegistrarDto) => { chamadas.push(`registrar:${dto.atividadeId}:${dto.inicioData}:${dto.fimData}`); return { dados: { id: 100 } }; },
    excluir: async (dto: { id: number }) => { chamadas.push(`excluir:${dto.id}`); return {}; },
    recuperar: async () => ({ dados: { ...execucao } }),
    recuperarAtiva: async () => ({ dados: null }),
    alterar: async (dto: ExecucaoAlterarDto & { id: number }) => {
      chamadas.push(`alterar:${dto.id}:${dto.inicioData}:${dto.fimData}:${dto.descricao}`);
      if (dto.inicioData !== undefined) execucao.inicioData = new Date(dto.inicioData);
      if (dto.fimData !== undefined) execucao.fimData = dto.fimData ? new Date(dto.fimData) : null;
      execucao.descricao = dto.descricao;
      return { dados: {} };
    },
  };
  return { servico: servico as unknown as ExecucaoService, chamadas, execucao };
}

const NOVA_DADOS = {
  execucaoId: 5, horaFim: '18:00',
  novoInicioData: '2026-10-17T17:00:00.000Z', novoFimData: '2026-10-17T21:00:00.000Z',
  inicioAnteriorData: '2026-10-17T17:00:00.000Z', fimAnteriorData: '2026-10-17T19:00:00.000Z',
};
const ANTES = { inicioData: new Date('2026-10-17T17:00:00Z'), fimData: new Date('2026-10-17T19:00:00Z'), descricao: 'Ajustes do login' };

function executorDeCorrecao(servico: ExecucaoService, sobreposicao = false) {
  const repositorio = { validarSobreposicao: async () => sobreposicao } as unknown as ExecucaoRepository;
  return new CorrigirExecucaoExecutor(servico, repositorio, atividadeService);
}

test('registrar: só o gestor executa e desfaz; o registro passa pela service com os instantes resolvidos', async () => {
  const { servico, chamadas } = criarServicoDeExecucao(ANTES);
  const executor = new RegistrarExecucaoExecutor(servico);
  const dados = { atividadeId: 9, data: '2026-10-17', horaInicio: '14:00', horaFim: '16:00', descricao: 'Revisão do login', inicioData: '2026-10-17T17:00:00.000Z', fimData: '2026-10-17T19:00:00.000Z' };
  await assert.rejects(executor.executar(dados, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(chamadas, []);
  const resultado = await executor.executar(dados, GESTOR);
  assert.deepEqual(chamadas, ['registrar:9:2026-10-17T17:00:00.000Z:2026-10-17T19:00:00.000Z']);
  assert.equal(resultado['execucaoId'], 100);
  await executor.desfazer(resultado, GESTOR);
  assert.equal(chamadas[1], 'excluir:100');
  await assert.rejects(executor.desfazer(resultado, DESENVOLVEDOR), UnauthorizedAccessException);
});

test('corrigir: altera pela service, guarda o antes e o desfazer devolve período e descrição', async () => {
  const { servico, chamadas, execucao } = criarServicoDeExecucao(ANTES);
  const executor = executorDeCorrecao(servico);
  const resultado = await executor.executar({ ...NOVA_DADOS, descricao: 'Ajustes e testes' }, DESENVOLVEDOR);
  assert.deepEqual(chamadas, ['alterar:5:2026-10-17T17:00:00.000Z:2026-10-17T21:00:00.000Z:Ajustes e testes']);
  assert.equal(resultado['descricaoAnterior'], 'Ajustes do login');
  chamadas.length = 0;
  await executor.desfazer(resultado, DESENVOLVEDOR);
  assert.deepEqual(chamadas, ['alterar:5:2026-10-17T17:00:00.000Z:2026-10-17T19:00:00.000Z:Ajustes do login']);
  assert.equal(execucao.fimData?.toISOString(), '2026-10-17T19:00:00.000Z');
});

test('corrigir: proposta velha (a execução mudou), sobreposição e desfazer inseguro são recusados sem alterar', async () => {
  const velha = criarServicoDeExecucao({ ...ANTES, fimData: new Date('2026-10-17T19:30:00Z') });
  await assert.rejects(executorDeCorrecao(velha.servico).executar(NOVA_DADOS, DESENVOLVEDOR), BusinessException);
  const sobreposta = criarServicoDeExecucao(ANTES);
  await assert.rejects(executorDeCorrecao(sobreposta.servico, true).executar(NOVA_DADOS, DESENVOLVEDOR), BusinessException);
  const mudada = criarServicoDeExecucao(ANTES);
  const executor = executorDeCorrecao(mudada.servico);
  const resultado = await executor.executar(NOVA_DADOS, DESENVOLVEDOR);
  mudada.execucao.fimData = new Date('2026-10-17T22:00:00Z');
  mudada.chamadas.length = 0;
  await assert.rejects(executor.desfazer(resultado, DESENVOLVEDOR), BusinessException);
  assert.equal(velha.chamadas.length + sobreposta.chamadas.length + mudada.chamadas.length, 0);
});

test('corrigir: desfazer que se sobreporia a uma execução feita depois é recusado, sem alterar', async () => {
  const { servico, chamadas } = criarServicoDeExecucao(ANTES);
  const ocupado = { validarSobreposicao: async () => true } as unknown as ExecucaoRepository;
  const executor = new CorrigirExecucaoExecutor(servico, ocupado, atividadeService);
  const resultado = { execucaoId: 5, inicioAnteriorData: NOVA_DADOS.inicioAnteriorData, fimAnteriorData: NOVA_DADOS.fimAnteriorData, descricaoAnterior: 'x', novoInicioData: ANTES.inicioData.toISOString(), novoFimData: ANTES.fimData!.toISOString(), descricaoNova: ANTES.descricao };
  await assert.rejects(executor.desfazer(resultado, DESENVOLVEDOR), BusinessException);
  assert.deepEqual(chamadas, []);
});

test('corrigir: obsoleta quando a execução já está como pedido ou já não está como a proposta a viu', async () => {
  const igual = criarServicoDeExecucao({ ...ANTES, fimData: new Date('2026-10-17T21:00:00Z') });
  assert.equal(await executorDeCorrecao(igual.servico).estaObsoleta(NOVA_DADOS, DESENVOLVEDOR), true);
  const outra = criarServicoDeExecucao({ ...ANTES, fimData: new Date('2026-10-17T19:30:00Z') });
  assert.equal(await executorDeCorrecao(outra.servico).estaObsoleta(NOVA_DADOS, DESENVOLVEDOR), true);
  const intacta = criarServicoDeExecucao(ANTES);
  assert.equal(await executorDeCorrecao(intacta.servico).estaObsoleta(NOVA_DADOS, DESENVOLVEDOR), false);
});

test('validar: os dados são conferidos nos dois executores', () => {
  const { servico } = criarServicoDeExecucao(ANTES);
  assert.doesNotThrow(() => executorDeCorrecao(servico).validar(NOVA_DADOS));
  assert.throws(() => executorDeCorrecao(servico).validar({ execucaoId: 5 }), BusinessException);
  assert.throws(() => new RegistrarExecucaoExecutor(servico).validar({ atividadeId: 9 }), BusinessException);
});
