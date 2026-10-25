import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AtividadeInternoAlterarDto, TipoAtividadePrioridadeEnum, TipoAtividadeStatusEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { AlterarAtividadeExecutor } from '../executores/alterar-atividade.executor';
import { AtividadeRepository } from '../repositories/atividade.repository';
import { AtividadeService } from '../services/atividade.service';
import { ProporAlterarAtividadeFerramenta } from './propor-alterar-atividade.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function prioridade(codigo: TipoAtividadePrioridadeEnum) {
  return { codigo, descricao: codigo, ordem: 1, cor: '#000000' };
}

/** `AtividadeService` em memória com uma atividade (9) e o registro das alterações pedidas. */
function criarServico(inicial: { status: TipoAtividadeStatusEnum; prioridade: TipoAtividadePrioridadeEnum; nome: string }) {
  const atividade = { id: 9, demandaId: 3, usuarioId: 4, ...inicial };
  const alteracoes: AtividadeInternoAlterarDto[] = [];
  const servico = {
    recuperar: async () => ({ dados: { id: atividade.id, demandaId: atividade.demandaId, usuarioId: atividade.usuarioId, nome: atividade.nome, status: atividade.status, prioridade: prioridade(atividade.prioridade) } }),
    alterar: async (dto: AtividadeInternoAlterarDto) => {
      alteracoes.push(dto);
      if (dto.status !== undefined) atividade.status = dto.status;
      if (dto.prioridade !== undefined) atividade.prioridade = dto.prioridade;
      if (dto.nome !== undefined) atividade.nome = dto.nome;
      return { dados: {} };
    },
  };
  return { servico: servico as unknown as AtividadeService, alteracoes, atividade };
}

function criarFerramenta(inicial: Parameters<typeof criarServico>[0], comExecucaoAtiva = false) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const repositorio = { possuiExecucaoAtiva: async () => comExecucaoAtiva };
  const demandaRepositorio = { recuperar: async () => ({ id: 3, nome: 'Autenticação' }) };
  const { servico } = criarServico(inicial);
  const ferramenta = new ProporAlterarAtividadeFerramenta(
    propostaIaService as unknown as PropostaIaService, servico, repositorio as unknown as AtividadeRepository, demandaRepositorio as unknown as DemandaRepository,
  );
  return { ferramenta, propostas };
}

const DESENVOLVENDO = { status: TipoAtividadeStatusEnum.DESENVOLVENDO, prioridade: TipoAtividadePrioridadeEnum.MEDIA, nome: 'Ajustar login' };

test('propor alterar guarda só o que muda, com os valores de antes e os nomes para o cartão', async () => {
  const { ferramenta, propostas } = criarFerramenta(DESENVOLVENDO);
  await ferramenta.executar({ atividadeId: 9, status: TipoAtividadeStatusEnum.DESENVOLVIDA, prioridade: TipoAtividadePrioridadeEnum.MEDIA }, USUARIO);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.ALTERAR_ATIVIDADE);
  assert.deepEqual(propostas[0].dados, {
    atividadeId: 9, atividadeNome: 'Ajustar login', demandaNome: 'Autenticação', atividadeUsuarioId: 4,
    status: 'DESENVOLVIDA', statusAnterior: 'DESENVOLVENDO',
  });
});

test('propor alterar sem nada que mude a atividade não cria proposta', async () => {
  const { ferramenta, propostas } = criarFerramenta(DESENVOLVENDO);
  await assert.rejects(ferramenta.executar({ atividadeId: 9, status: TipoAtividadeStatusEnum.DESENVOLVENDO }, USUARIO), BusinessException);
  await assert.rejects(ferramenta.executar({ atividadeId: 9 }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
});

test('propor mudar o status com execução em andamento é recusado e manda pausar antes; prioridade e nome passam', async () => {
  const { ferramenta, propostas } = criarFerramenta(DESENVOLVENDO, true);
  await assert.rejects(ferramenta.executar({ atividadeId: 9, status: TipoAtividadeStatusEnum.DESENVOLVIDA }, USUARIO), (erro: BusinessException) => JSON.stringify(erro.getResponse()).includes('propor_pausar_execucao'));
  assert.equal(propostas.length, 0);
  await ferramenta.executar({ atividadeId: 9, prioridade: TipoAtividadePrioridadeEnum.ALTA, nome: 'Novo nome' }, USUARIO);
  assert.equal(propostas.length, 1);
});

test('executar altera pela service e guarda os valores de antes e os aplicados', async () => {
  const { servico, alteracoes } = criarServico(DESENVOLVENDO);
  const resultado = await new AlterarAtividadeExecutor(servico).executar({ atividadeId: 9, status: 'DESENVOLVIDA', prioridade: 'ALTA' }, USUARIO);
  assert.deepEqual(alteracoes, [{ id: 9, status: 'DESENVOLVIDA', prioridade: 'ALTA', nome: undefined }]);
  assert.deepEqual(resultado, { atividadeId: 9, status: 'DESENVOLVIDA', statusAnterior: 'DESENVOLVENDO', prioridade: 'ALTA', prioridadeAnterior: 'MEDIA' });
});

test('desfazer devolve os valores de antes', async () => {
  const { servico, alteracoes, atividade } = criarServico(DESENVOLVENDO);
  const executor = new AlterarAtividadeExecutor(servico);
  const resultado = await executor.executar({ atividadeId: 9, status: 'DESENVOLVIDA', nome: 'Login pronto' }, USUARIO);
  alteracoes.length = 0;
  await executor.desfazer(resultado, USUARIO);
  assert.deepEqual(alteracoes, [{ id: 9, status: 'DESENVOLVENDO', prioridade: undefined, nome: 'Ajustar login' }]);
  assert.equal(atividade.status, 'DESENVOLVENDO');
  assert.equal(atividade.nome, 'Ajustar login');
});

test('desfazer é recusado se a atividade mudou depois da alteração', async () => {
  const { servico, alteracoes, atividade } = criarServico(DESENVOLVENDO);
  const executor = new AlterarAtividadeExecutor(servico);
  const resultado = await executor.executar({ atividadeId: 9, status: 'DESENVOLVIDA' }, USUARIO);
  atividade.status = TipoAtividadeStatusEnum.PENDENTE;
  alteracoes.length = 0;
  await assert.rejects(executor.desfazer(resultado, USUARIO), BusinessException);
  assert.deepEqual(alteracoes, []);
});

test('validar recusa dados sem alteração ou com campo desconhecido; obsoleta quando já está como pedido', async () => {
  const { servico } = criarServico(DESENVOLVENDO);
  const executor = new AlterarAtividadeExecutor(servico);
  assert.doesNotThrow(() => executor.validar({ atividadeId: 9, status: 'DESENVOLVIDA', atividadeNome: 'x', statusAnterior: 'PENDENTE' }));
  assert.throws(() => executor.validar({ atividadeId: 9 }), BusinessException);
  assert.throws(() => executor.validar({ atividadeId: 9, status: 'DESENVOLVIDA', usuarioId: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta({ atividadeId: 9, status: 'DESENVOLVENDO' }, USUARIO), true);
  assert.equal(await executor.estaObsoleta({ atividadeId: 9, status: 'DESENVOLVIDA' }, USUARIO), false);
});
