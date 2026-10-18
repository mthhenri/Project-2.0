import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DemandaInternoAlterarDto, TipoDemandaStatusEnum, TipoPropostaIaEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { AlterarDemandaExecutor } from '../executores/alterar-demanda.executor';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';
import { ProporAlterarDemandaFerramenta } from './propor-alterar-demanda.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

const INICIAL = { nome: 'Tela de login', status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 8, previsaoFimData: '2026-11-15' as string | null };

/** `DemandaService` em memória com uma demanda (4) e o registro das alterações pedidas. */
function criarServico(inicial: typeof INICIAL = INICIAL) {
  const demanda = { id: 4, projetoId: 1, ...inicial };
  const alteracoes: DemandaInternoAlterarDto[] = [];
  const servico = {
    recuperar: async () => ({ dados: { ...demanda } }),
    alterar: async (dto: DemandaInternoAlterarDto) => {
      alteracoes.push(dto);
      if (dto.nome !== undefined) demanda.nome = dto.nome;
      if (dto.status !== undefined) demanda.status = dto.status;
      if (dto.horasEstimadas !== undefined) demanda.horasEstimadas = dto.horasEstimadas;
      if (dto.previsaoFimData !== undefined) demanda.previsaoFimData = dto.previsaoFimData;
      return { dados: {} };
    },
  };
  return { servico: servico as unknown as DemandaService, alteracoes, demanda };
}

function criarFerramenta(abertas = 0, inicial: typeof INICIAL = INICIAL) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = { criar: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const repositorio = { contarAtividadesEmAberto: async () => abertas };
  const projetoService = { recuperar: async () => ({ dados: { id: 1, nome: 'Projeto Demo' } }) };
  const { servico } = criarServico(inicial);
  const ferramenta = new ProporAlterarDemandaFerramenta(
    propostaIaService as unknown as PropostaIaService, servico, repositorio as unknown as DemandaRepository, projetoService as unknown as ProjetoService,
  );
  return { ferramenta, propostas };
}

test('propor alterar guarda só o que muda, com os valores de antes e os nomes para o cartão', async () => {
  const { ferramenta, propostas } = criarFerramenta();
  await ferramenta.executar({ demandaId: 4, status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 12, previsaoFimData: '2026-11-30' }, GESTOR);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.ALTERAR_DEMANDA);
  assert.deepEqual(propostas[0].dados, {
    demandaId: 4, demandaNome: 'Tela de login', projetoNome: 'Projeto Demo',
    horasEstimadas: 12, horasAnteriores: 8, previsaoFimData: '2026-11-30', previsaoAnteriorData: '2026-11-15',
  });
});

test('propor alterar sem nada que mude a demanda, ou com nome vazio, não cria proposta', async () => {
  const { ferramenta, propostas } = criarFerramenta();
  await assert.rejects(ferramenta.executar({ demandaId: 4 }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 8 }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, nome: '   ' }, GESTOR), BusinessException);
  assert.equal(propostas.length, 0);
  assert.equal(ferramenta.permissao, 'GESTOR');
});

test('propor concluir avisa quantas atividades seguem abertas e não bloqueia', async () => {
  const { ferramenta, propostas } = criarFerramenta(3);
  await ferramenta.executar({ demandaId: 4, status: TipoDemandaStatusEnum.CONCLUIDA }, GESTOR);
  assert.equal(propostas[0].dados['atividadesEmAberto'], 3);
  assert.equal(propostas[0].dados['statusAnterior'], 'PLANEJADA');
  const semAbertas = criarFerramenta(0);
  await semAbertas.ferramenta.executar({ demandaId: 4, status: TipoDemandaStatusEnum.CONCLUIDA }, GESTOR);
  assert.equal(semAbertas.propostas[0].dados['atividadesEmAberto'], undefined);
});

test('executar altera pela service e guarda os valores de antes e os aplicados', async () => {
  const { servico, alteracoes } = criarServico();
  const resultado = await new AlterarDemandaExecutor(servico).executar({ demandaId: 4, status: 'CONCLUIDA', horasEstimadas: 10 }, GESTOR);
  assert.deepEqual(alteracoes, [{ id: 4, nome: undefined, status: 'CONCLUIDA', horasEstimadas: 10, previsaoFimData: undefined }]);
  assert.deepEqual(resultado, { demandaId: 4, status: 'CONCLUIDA', statusAnterior: 'PLANEJADA', horasEstimadas: 10, horasAnteriores: 8 });
});

test('só o gestor executa e desfaz', async () => {
  const { servico, alteracoes } = criarServico();
  const executor = new AlterarDemandaExecutor(servico);
  await assert.rejects(executor.executar({ demandaId: 4, status: 'CONCLUIDA' }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(executor.desfazer({ demandaId: 4, status: 'CONCLUIDA', statusAnterior: 'PLANEJADA' }, DESENVOLVEDOR), UnauthorizedAccessException);
  assert.deepEqual(alteracoes, []);
});

test('desfazer devolve os valores de antes, inclusive limpar a previsão que não existia', async () => {
  const { servico, alteracoes, demanda } = criarServico({ ...INICIAL, previsaoFimData: null });
  const executor = new AlterarDemandaExecutor(servico);
  const resultado = await executor.executar({ demandaId: 4, nome: 'Login revisado', previsaoFimData: '2026-12-01' }, GESTOR);
  alteracoes.length = 0;
  await executor.desfazer(resultado, GESTOR);
  assert.deepEqual(alteracoes, [{ id: 4, nome: 'Tela de login', previsaoFimData: null }]);
  assert.equal(demanda.previsaoFimData, null);
  assert.equal(demanda.nome, 'Tela de login');
});

test('desfazer é recusado se a demanda mudou depois da alteração', async () => {
  const { servico, alteracoes, demanda } = criarServico();
  const executor = new AlterarDemandaExecutor(servico);
  const resultado = await executor.executar({ demandaId: 4, status: 'CONCLUIDA' }, GESTOR);
  demanda.status = TipoDemandaStatusEnum.CANCELADA;
  alteracoes.length = 0;
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  assert.deepEqual(alteracoes, []);
});

test('validar recusa dados sem alteração ou com campo desconhecido; obsoleta quando já está como pedido', async () => {
  const { servico } = criarServico();
  const executor = new AlterarDemandaExecutor(servico);
  assert.doesNotThrow(() => executor.validar({ demandaId: 4, status: 'CONCLUIDA', statusAnterior: 'PLANEJADA', demandaNome: 'x', atividadesEmAberto: 2 }));
  assert.throws(() => executor.validar({ demandaId: 4 }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 4, status: 'CONCLUIDA', usuarioId: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, status: 'PLANEJADA' }, GESTOR), true);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, status: 'CONCLUIDA' }, GESTOR), false);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, previsaoFimData: '2026-11-15' }, GESTOR), true);
});
