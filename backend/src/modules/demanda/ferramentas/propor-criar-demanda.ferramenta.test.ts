import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { DemandaRepository } from '../repositories/demanda.repository';
import { ProporCriarDemandaFerramenta } from './propor-criar-demanda.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function montar() {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const existentes: Record<number, { tipo: TipoPropostaIaEnum; status: StatusPropostaIaEnum; dados: Record<string, unknown> }> = {
    50: { tipo: TipoPropostaIaEnum.CRIAR_PROJETO, status: StatusPropostaIaEnum.PENDENTE, dados: { nome: 'Loja' } },
    51: { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, status: StatusPropostaIaEnum.PENDENTE, dados: { nome: 'Cadastro', isEstrutural: true } },
    52: { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, status: StatusPropostaIaEnum.PENDENTE, dados: { nome: 'Folha', isEstrutural: false } },
    53: { tipo: TipoPropostaIaEnum.CRIAR_DEMANDA, status: StatusPropostaIaEnum.EXPIRADA, dados: { nome: 'Recusada', isEstrutural: true } },
  };
  const propostaIaService = {
    criar: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 60, status: 'PENDENTE' };
    },
    recuperarPorId: async (id: number) => ({ dados: { id, ...existentes[id] } }),
  };
  const projetoService = { recuperar: async ({ id }: { id: number }) => ({ dados: { id, nome: 'Gestão de Relacionamento' } }) };
  const demandaRepositorio = {
    recuperar: async ({ id }: { id: number }) => (id === 3 ? { id, nome: 'Estrutura', projetoId: 2, isEstrutural: true } : id === 4 ? { id, nome: 'Trabalho', projetoId: 2, isEstrutural: false } : null),
  };
  const ferramenta = new ProporCriarDemandaFerramenta(
    propostaIaService as unknown as PropostaIaService,
    projetoService as unknown as ProjetoService,
    demandaRepositorio as unknown as DemandaRepository,
  );
  return { ferramenta, propostas };
}

test('demanda de estrutura de topo num projeto existente leva o nome do projeto', async () => {
  const { ferramenta, propostas } = montar();
  const resultado = (await ferramenta.executar({ projetoId: 2, nome: 'Cadastro', isEstrutural: true }, GESTOR)) as { propostaId: number };
  assert.equal(resultado.propostaId, 60);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.CRIAR_DEMANDA);
  assert.deepEqual(propostas[0].dados, { projetoId: 2, nome: 'Cadastro', isEstrutural: true, projetoNome: 'Gestão de Relacionamento' });
});

test('sub-demanda de uma demanda existente de estrutura leva o nome da pai', async () => {
  const { ferramenta, propostas } = montar();
  await ferramenta.executar({ projetoId: 2, demandaPaiId: 3, nome: 'Novo cadastro' }, DESENVOLVEDOR);
  assert.equal(propostas[0].dados['demandaPaiNome'], 'Estrutura');
});

test('pai que não é de estrutura, de outro projeto ou inexistente é recusada', async () => {
  const { ferramenta, propostas } = montar();
  await assert.rejects(ferramenta.executar({ projetoId: 2, demandaPaiId: 4, nome: 'Filha' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ projetoId: 9, demandaPaiId: 3, nome: 'Filha' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ projetoId: 2, demandaPaiId: 99, nome: 'Filha' }, GESTOR));
  assert.equal(propostas.length, 0);
});

test('o desenvolvedor só propõe sub-demanda', async () => {
  const { ferramenta, propostas } = montar();
  await assert.rejects(ferramenta.executar({ projetoId: 2, nome: 'Topo' }, DESENVOLVEDOR), BusinessException);
  assert.equal(propostas.length, 0);
});

test('encadeia projeto e demanda pai que ainda são propostas', async () => {
  const { ferramenta, propostas } = montar();
  await ferramenta.executar({ projetoPropostaId: 50, demandaPaiPropostaId: 51, nome: 'Novo cadastro' }, GESTOR);
  assert.equal(propostas[0].dados['projetoNome'], 'Loja');
  assert.equal(propostas[0].dados['demandaPaiNome'], 'Cadastro');
});

test('proposta referenciada de outro tipo, recusada ou de pai que não é de estrutura é recusada', async () => {
  const { ferramenta } = montar();
  await assert.rejects(ferramenta.executar({ projetoPropostaId: 51, nome: 'Qualquer' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ projetoPropostaId: 50, demandaPaiPropostaId: 53, nome: 'Qualquer' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ projetoPropostaId: 50, demandaPaiPropostaId: 52, nome: 'Qualquer' }, GESTOR), BusinessException);
});

test('exige o projeto por exatamente um dos dois campos', async () => {
  const { ferramenta } = montar();
  await assert.rejects(ferramenta.executar({ nome: 'Sem projeto' }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ projetoId: 2, projetoPropostaId: 50, nome: 'Com dois' }, GESTOR), BusinessException);
});
