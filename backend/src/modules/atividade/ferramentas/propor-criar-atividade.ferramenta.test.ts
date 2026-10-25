import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoAtividadePrioridadeEnum, TipoPropostaIaEnum, TipoUsuarioEnum, TipoUsuarioStatusEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { ResourceNotFoundException } from '../../../core/exceptions/resource-not-found.exception';
import { DemandaRepository } from '../../demanda/repositories/demanda.repository';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { UsuarioService } from '../../usuario/services/usuario.service';
import { ProporCriarAtividadeFerramenta } from './propor-criar-atividade.ferramenta';

// propor_criar_atividade: só cria a proposta (a atividade nasce quando o usuário confirma — ver criar-atividade.executor.test.ts).

const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function montar(opcoes: { demanda?: unknown; dono?: Record<string, unknown> | null } = {}) {
  const propostas: { usuarioId: number; tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criarComAutonomia: async (dto: (typeof propostas)[number]) => { propostas.push(dto); return { id: 55, status: 'PENDENTE' }; } };
  const demandaRepositorio = { recuperar: async () => (opcoes.demanda === undefined ? { id: 9, nome: 'Autenticação' } : opcoes.demanda) };
  const usuarioService = {
    recuperar: async () => ({ dados: opcoes.dono === undefined ? { id: 12, nomeCompleto: 'Bia', status: TipoUsuarioStatusEnum.ATIVO } : opcoes.dono }),
  };
  const ferramenta = new ProporCriarAtividadeFerramenta(
    propostaIaService as unknown as PropostaIaService, demandaRepositorio as unknown as DemandaRepository, usuarioService as unknown as UsuarioService,
  );
  return { ferramenta, propostas };
}

test('propõe a atividade do próprio usuário com o nome da demanda para o cartão e sem criar nada', async () => {
  const { ferramenta, propostas } = montar();
  const resposta = await ferramenta.executar({ demandaId: 9, nome: 'Ajustar login', prioridade: TipoAtividadePrioridadeEnum.ALTA }, DESENVOLVEDOR) as { propostaId: number };
  assert.equal(resposta.propostaId, 55);
  assert.deepEqual(propostas, [{
    usuarioId: 7, tipo: TipoPropostaIaEnum.CRIAR_ATIVIDADE,
    dados: { demandaId: 9, nome: 'Ajustar login', prioridade: 'ALTA', demandaNome: 'Autenticação' },
  }]);
});

test('demanda inexistente é recusada e nenhuma proposta é criada', async () => {
  const { ferramenta, propostas } = montar({ demanda: null });
  await assert.rejects(ferramenta.executar({ demandaId: 9, nome: 'Ajustar login' }, DESENVOLVEDOR), ResourceNotFoundException);
  assert.equal(propostas.length, 0);
});

test('usuarioId igual ao do próprio usuário é ruído: some da proposta', async () => {
  const { ferramenta, propostas } = montar();
  await ferramenta.executar({ demandaId: 9, nome: 'Ajustar login', usuarioId: 7 }, DESENVOLVEDOR);
  assert.equal('usuarioId' in propostas[0].dados, false);
});

test('desenvolvedor não cria atividade para outra pessoa', async () => {
  const { ferramenta, propostas } = montar();
  await assert.rejects(ferramenta.executar({ demandaId: 9, nome: 'Ajustar login', usuarioId: 12 }, DESENVOLVEDOR), BusinessException);
  assert.equal(propostas.length, 0);
});

test('gestor propõe para outra pessoa ativa, com o nome dela no cartão', async () => {
  const { ferramenta, propostas } = montar();
  await ferramenta.executar({ demandaId: 9, nome: 'Ajustar login', usuarioId: 12 }, GESTOR);
  assert.equal(propostas[0].dados.usuarioId, 12);
  assert.equal(propostas[0].dados.usuarioNome, 'Bia');
});

test('gestor não propõe para usuário inexistente nem inativo', async () => {
  const inexistente = montar({ dono: null });
  await assert.rejects(inexistente.ferramenta.executar({ demandaId: 9, nome: 'Ajustar login', usuarioId: 12 }, GESTOR), BusinessException);
  const inativo = montar({ dono: { id: 12, nomeCompleto: 'Bia', status: TipoUsuarioStatusEnum.INATIVO } });
  await assert.rejects(inativo.ferramenta.executar({ demandaId: 9, nome: 'Ajustar login', usuarioId: 12 }, GESTOR), BusinessException);
  assert.equal(inexistente.propostas.length + inativo.propostas.length, 0);
});

test('é ferramenta de proposta, aberta a qualquer usuário', () => {
  const { ferramenta } = montar();
  assert.deepEqual([ferramenta.tipo, ferramenta.permissao, ferramenta.tipoProposta], ['PROPOSTA', 'QUALQUER', TipoPropostaIaEnum.CRIAR_ATIVIDADE]);
});
