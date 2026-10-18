import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { ProporCriarAtividadeFerramenta } from '../../atividade/ferramentas/propor-criar-atividade.ferramenta';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ExecucaoService } from '../services/execucao.service';
import { ProporIniciarExecucaoFerramenta } from './propor-iniciar-execucao.ferramenta';
import { ProporPausarExecucaoFerramenta } from './propor-pausar-execucao.ferramenta';

const USUARIO = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function montar(opcoes: { ativa?: { id: number; atividadeId: number; descricao: string } | null; demandaExiste?: boolean } = {}) {
  const propostas: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = {
    criar: async (dto: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 77, status: 'PENDENTE' };
    },
  };
  const nomesDasAtividades: Record<number, { nome: string; demandaId: number; status: string }> = {
    9: { nome: 'Ajustar login', demandaId: 3, status: 'DESENVOLVENDO' },
    5: { nome: 'Layout do carrinho', demandaId: 4, status: 'PLANEJADA' },
    8: { nome: 'Revisar textos', demandaId: 3, status: 'PENDENTE' },
  };
  const atividadeService = { recuperar: async ({ id }: { id: number }) => ({ dados: { id, ...nomesDasAtividades[id] } }) };
  const demandaRepositorio = {
    recuperar: async ({ id }: { id: number }) => (opcoes.demandaExiste === false ? null : { id, nome: id === 3 ? 'Autenticação' : 'Carrinho' }),
  };
  const execucaoService = { recuperarAtiva: async () => ({ dados: opcoes.ativa ?? null }), recuperarAtivaDoUsuario: async () => ({ dados: opcoes.ativa ?? null }) };
  const proposta = propostaIaService as unknown as PropostaIaService;
  return {
    propostas,
    iniciar: new ProporIniciarExecucaoFerramenta(proposta, atividadeService as unknown as AtividadeService, demandaRepositorio as unknown as DemandaRepository, execucaoService as unknown as ExecucaoService),
    pausar: new ProporPausarExecucaoFerramenta(proposta, atividadeService as unknown as AtividadeService, demandaRepositorio as unknown as DemandaRepository, execucaoService as unknown as ExecucaoService),
    criar: new ProporCriarAtividadeFerramenta(proposta, demandaRepositorio as unknown as DemandaRepository, {} as never),
  };
}

test('propor iniciar só cria a proposta, com os nomes e a execução que será pausada', async () => {
  const { iniciar, propostas } = montar({ ativa: { id: 1, atividadeId: 5, descricao: 'x' } });
  const resultado = (await iniciar.executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO)) as { propostaId: number };
  assert.equal(resultado.propostaId, 77);
  assert.equal(propostas.length, 1);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.INICIAR_EXECUCAO);
  assert.equal(propostas[0].usuarioId, 7);
  assert.deepEqual(propostas[0].dados, {
    atividadeId: 9,
    descricao: 'Validar e-mail',
    atividadeNome: 'Ajustar login',
    demandaNome: 'Autenticação',
    pausaraAtividadeNome: 'Layout do carrinho',
  });
});

test('propor iniciar na atividade que já está em execução não avisa pausa', async () => {
  const { iniciar, propostas } = montar({ ativa: { id: 1, atividadeId: 9, descricao: 'x' } });
  await iniciar.executar({ atividadeId: 9, descricao: 'Validar e-mail' }, USUARIO);
  assert.equal(propostas[0].dados['pausaraAtividadeNome'], undefined);
});

test('propor iniciar numa atividade que não é planejada nem em desenvolvimento não cria proposta', async () => {
  const { iniciar, propostas } = montar();
  await assert.rejects(iniciar.executar({ atividadeId: 8, descricao: 'Revisar' }, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
});

test('propor iniciar com novoStatus numa atividade pendente cria a proposta e guarda o status anterior', async () => {
  const { iniciar, propostas } = montar();
  await iniciar.executar({ atividadeId: 8, descricao: 'Revisar', novoStatus: 'DESENVOLVENDO' } as never, USUARIO);
  assert.equal(propostas[0].dados['novoStatus'], 'DESENVOLVENDO');
  assert.equal(propostas[0].dados['statusAnterior'], 'PENDENTE');
});

test('propor iniciar com novoStatus igual ao atual não registra mudança', async () => {
  const { iniciar, propostas } = montar();
  await iniciar.executar({ atividadeId: 5, descricao: 'Layout', novoStatus: 'PLANEJADA' } as never, USUARIO);
  assert.equal(propostas[0].dados['statusAnterior'], undefined);
});

test('propor pausar sem execução em andamento não cria proposta', async () => {
  const { pausar, propostas } = montar({ ativa: null });
  await assert.rejects(pausar.executar({}, USUARIO), BusinessException);
  assert.equal(propostas.length, 0);
});

test('propor pausar leva a descrição e os nomes da execução ativa', async () => {
  const { pausar, propostas } = montar({ ativa: { id: 1, atividadeId: 5, descricao: 'x' } });
  await pausar.executar({ descricao: 'Revisão do layout do carrinho.' }, USUARIO);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.PAUSAR_EXECUCAO);
  assert.deepEqual(propostas[0].dados, { descricao: 'Revisão do layout do carrinho.', atividadeNome: 'Layout do carrinho', demandaNome: 'Carrinho' });
});

test('propor criar atividade leva o nome da demanda e recusa demanda inexistente', async () => {
  const { criar, propostas } = montar();
  await criar.executar({ demandaId: 3, nome: 'Ajustar cadastro', prioridade: undefined }, USUARIO);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.CRIAR_ATIVIDADE);
  assert.equal(propostas[0].dados['demandaNome'], 'Autenticação');

  const semDemanda = montar({ demandaExiste: false });
  await assert.rejects(semDemanda.criar.executar({ demandaId: 999, nome: 'Ajustar cadastro' }, USUARIO), ResourceNotFoundException);
  assert.equal(semDemanda.propostas.length, 0);
});
