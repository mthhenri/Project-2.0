import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StatusPropostaIaEnum, TipoDemandaStatusEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';
import { CriarDemandaExecutor } from './criar-demanda.executor';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;

function mensagemContem(trecho: string) {
  return (erro: unknown) => erro instanceof BusinessException && String((erro.getResponse() as { mensagem: string }).mensagem).includes(trecho);
}

function criar(opcoes: { possuiFilhas?: boolean; projeto?: Record<string, unknown> | null; pai?: Record<string, unknown> | null } = {}) {
  const criadas: Record<string, unknown>[] = [];
  const excluidas: number[] = [];
  const servico = {
    criar: async (dto: Record<string, unknown>) => {
      criadas.push(dto);
      return { dados: { id: 31 } };
    },
    recuperar: async () => ({ dados: { id: 31 } }),
    excluir: async (dto: { id: number }) => {
      excluidas.push(dto.id);
    },
  };
  const repositorio = { possuiFilhasOuAtividades: async () => opcoes.possuiFilhas ?? false };
  const proposta = (tipo: TipoPropostaIaEnum, id: number, status: StatusPropostaIaEnum, resultado: Record<string, unknown> | null) => ({ dados: { id, tipo, status, dados: {}, resultado } });
  const propostaIaService = {
    recuperarPorId: async (id: number) =>
      id === 50
        ? proposta(TipoPropostaIaEnum.CRIAR_PROJETO, 50, opcoes.projeto === null ? StatusPropostaIaEnum.PENDENTE : StatusPropostaIaEnum.CONFIRMADA, opcoes.projeto === null ? null : { projetoId: 8 })
        : proposta(TipoPropostaIaEnum.CRIAR_DEMANDA, 51, opcoes.pai === null ? StatusPropostaIaEnum.PENDENTE : StatusPropostaIaEnum.CONFIRMADA, opcoes.pai === null ? null : { demandaId: 20 }),
  };
  const executor = new CriarDemandaExecutor(servico as unknown as DemandaService, repositorio as unknown as DemandaRepository, propostaIaService as unknown as PropostaIaService);
  return { executor, criadas, excluidas };
}

test('cria planejada pelo usuário do token, com os padrões da tela', async () => {
  const { executor, criadas } = criar();
  const resultado = await executor.executar({ projetoId: 2, nome: 'Cadastro', isEstrutural: true, projetoNome: 'Loja' }, GESTOR);
  assert.deepEqual(criadas[0], {
    projetoId: 2,
    demandaPaiId: undefined,
    nome: 'Cadastro',
    descricaoTecnica: undefined,
    descricaoCliente: undefined,
    horasEstimadas: 0,
    status: TipoDemandaStatusEnum.PLANEJADA,
    isEstrutural: true,
    previsaoFimData: undefined,
  });
  assert.equal(resultado['demandaId'], 31);
});

test('o projeto e a pai vêm do resultado das propostas confirmadas', async () => {
  const { executor, criadas } = criar();
  await executor.executar({ projetoPropostaId: 50, demandaPaiPropostaId: 51, nome: 'Novo cadastro' }, GESTOR);
  assert.equal(criadas[0].projetoId, 8);
  assert.equal(criadas[0].demandaPaiId, 20);
  assert.equal(criadas[0].isEstrutural, false);
});

test('proposta da qual depende ainda pendente manda confirmar antes', async () => {
  const semProjeto = criar({ projeto: null });
  await assert.rejects(semProjeto.executor.executar({ projetoPropostaId: 50, nome: 'Novo cadastro', projetoNome: 'Loja' }, GESTOR), mensagemContem('Confirme antes o projeto "Loja"'));
  const semPai = criar({ pai: null });
  await assert.rejects(semPai.executor.executar({ projetoId: 2, demandaPaiPropostaId: 51, nome: 'Novo cadastro', demandaPaiNome: 'Cadastro' }, GESTOR), mensagemContem('Confirme antes a demanda "Cadastro"'));
  assert.equal(semProjeto.criadas.length + semPai.criadas.length, 0);
});

test('desfazer exclui a demanda vazia e recusa a que já tem filhas ou atividades', async () => {
  const vazia = criar();
  await vazia.executor.desfazer({ demandaId: 31 }, GESTOR);
  assert.deepEqual(vazia.excluidas, [31]);

  const comFilhas = criar({ possuiFilhas: true });
  await assert.rejects(comFilhas.executor.desfazer({ demandaId: 31 }, GESTOR), BusinessException);
  assert.deepEqual(comFilhas.excluidas, []);
});

test('os dados são validados (nome curto, campo desconhecido)', () => {
  const { executor } = criar();
  assert.throws(() => executor.validar({ projetoId: 2, nome: 'ab' }), BusinessException);
  assert.throws(() => executor.validar({ projetoId: 2, nome: 'Cadastro', status: 'CONCLUIDA' }), BusinessException);
});
