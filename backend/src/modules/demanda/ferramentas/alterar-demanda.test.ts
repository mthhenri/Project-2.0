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

/** Valida que a `BusinessException` traz o texto (a mensagem fica no corpo da resposta HTTP, não em `message`). */
const contem = (texto: string) => (erro: BusinessException) => JSON.stringify(erro.getResponse()).includes(texto);

const INICIAL = {
  nome: 'Tela de login', status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 8, previsaoFimData: '2026-11-15' as string | null,
  documentacao: null as string | null, demandaPaiId: null as number | null,
};

/** Demandas que servem de pai nos testes: 20 estrutural do mesmo projeto, 21 não estrutural, 22 de outro projeto, 30 filha da demanda 4. */
const OUTRAS: Record<number, { id: number; nome: string; projetoId: number; isEstrutural: boolean }> = {
  20: { id: 20, nome: 'Autenticação', projetoId: 1, isEstrutural: true },
  21: { id: 21, nome: 'Ajustes', projetoId: 1, isEstrutural: false },
  22: { id: 22, nome: 'Outro projeto', projetoId: 2, isEstrutural: true },
  30: { id: 30, nome: 'Filha da 4', projetoId: 1, isEstrutural: true },
};

/** O repositório: a subárvore da demanda 4 é ela mesma e a 30. */
const repositorioDeDemanda = { listarDescendentes: async ({ demandaId }: { demandaId: number }) => [{ id: demandaId }, { id: 30 }], contarAtividadesEmAberto: async () => 0 };

/** `DemandaService` em memória com uma demanda (4) e o registro das alterações pedidas. */
function criarServico(inicial: typeof INICIAL = INICIAL) {
  const demanda = { id: 4, projetoId: 1, ...inicial };
  const alteracoes: DemandaInternoAlterarDto[] = [];
  const servico = {
    recuperar: async ({ id }: { id: number }) => ({ dados: id === 4 ? { ...demanda } : OUTRAS[id] }),
    alterar: async (dto: DemandaInternoAlterarDto) => {
      alteracoes.push(dto);
      if (dto.documentacao !== undefined) demanda.documentacao = dto.documentacao;
      if (dto.demandaPaiId !== undefined) demanda.demandaPaiId = dto.demandaPaiId;
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
  const propostaIaService = { criarComAutonomia: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => { propostas.push(dto); return { id: 77, status: 'PENDENTE' }; } };
  const repositorio = { ...repositorioDeDemanda, contarAtividadesEmAberto: async () => abertas };
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

test('propor acrescentar documentação guarda a documentação de antes para o cartão mostrar o diff', async () => {
  const comDocumentacao = criarFerramenta(0, { ...INICIAL, documentacao: 'Login por e-mail e senha.' });
  await comDocumentacao.ferramenta.executar({ demandaId: 4, acrescentarDocumentacao: 'Bloqueia após 5 tentativas.' }, GESTOR);
  assert.equal(comDocumentacao.propostas[0].dados['documentacaoAnterior'], 'Login por e-mail e senha.');
  assert.equal(comDocumentacao.propostas[0].dados['acrescentarDocumentacao'], 'Bloqueia após 5 tentativas.');
  const semDocumentacao = criarFerramenta();
  await semDocumentacao.ferramenta.executar({ demandaId: 4, acrescentarDocumentacao: 'Primeira anotação.' }, GESTOR);
  assert.equal(semDocumentacao.propostas[0].dados['documentacaoAnterior'], null);
});

test('propor alterar sem nada que mude a demanda, ou com nome vazio, não cria proposta', async () => {
  const { ferramenta, propostas } = criarFerramenta();
  await assert.rejects(ferramenta.executar({ demandaId: 4 }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, status: TipoDemandaStatusEnum.PLANEJADA, horasEstimadas: 8 }, GESTOR), BusinessException);
  await assert.rejects(ferramenta.executar({ demandaId: 4, nome: '   ' }, GESTOR), BusinessException);
  assert.equal(propostas.length, 0);
  assert.equal(ferramenta.permissao, 'QUALQUER');
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
  const resultado = await new AlterarDemandaExecutor(servico, repositorioDeDemanda as never).executar({ demandaId: 4, status: 'CONCLUIDA', horasEstimadas: 10 }, GESTOR);
  assert.deepEqual(alteracoes, [{ id: 4, nome: undefined, status: 'CONCLUIDA', horasEstimadas: 10, previsaoFimData: undefined }]);
  assert.deepEqual(resultado, { demandaId: 4, status: 'CONCLUIDA', statusAnterior: 'PLANEJADA', horasEstimadas: 10, horasAnteriores: 8 });
});

test('o desenvolvedor executa e desfaz: quem decide se ele é membro é a service', async () => {
  const { servico, alteracoes } = criarServico();
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, status: 'CONCLUIDA' }, DESENVOLVEDOR);
  await executor.desfazer(resultado, DESENVOLVEDOR);
  assert.equal(alteracoes.length, 2);
});

test('desfazer devolve os valores de antes, inclusive limpar a previsão que não existia', async () => {
  const { servico, alteracoes, demanda } = criarServico({ ...INICIAL, previsaoFimData: null });
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, nome: 'Login revisado', previsaoFimData: '2026-12-01' }, GESTOR);
  alteracoes.length = 0;
  await executor.desfazer(resultado, GESTOR);
  assert.deepEqual(alteracoes, [{ id: 4, nome: 'Tela de login', previsaoFimData: null }]);
  assert.equal(demanda.previsaoFimData, null);
  assert.equal(demanda.nome, 'Tela de login');
});

test('desfazer é recusado se a demanda mudou depois da alteração', async () => {
  const { servico, alteracoes, demanda } = criarServico();
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, status: 'CONCLUIDA' }, GESTOR);
  demanda.status = TipoDemandaStatusEnum.CANCELADA;
  alteracoes.length = 0;
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  assert.deepEqual(alteracoes, []);
});

test('validar recusa dados sem alteração ou com campo desconhecido; obsoleta quando já está como pedido', async () => {
  const { servico } = criarServico();
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  assert.doesNotThrow(() => executor.validar({ demandaId: 4, status: 'CONCLUIDA', statusAnterior: 'PLANEJADA', demandaNome: 'x', atividadesEmAberto: 2 }));
  assert.throws(() => executor.validar({ demandaId: 4 }), BusinessException);
  assert.throws(() => executor.validar({ demandaId: 4, status: 'CONCLUIDA', usuarioId: 1 }), BusinessException);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, status: 'PLANEJADA' }, GESTOR), true);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, status: 'CONCLUIDA' }, GESTOR), false);
  assert.equal(await executor.estaObsoleta({ demandaId: 4, previsaoFimData: '2026-11-15' }, GESTOR), true);
});

test('propor mover: confere pai estrutural, do mesmo projeto e fora da subárvore, e mostra o pai de antes e o novo', async () => {
  const { ferramenta, propostas } = criarFerramenta(0, { ...INICIAL, demandaPaiId: 20 });
  await assert.rejects(ferramenta.executar({ demandaId: 4, demandaPaiId: 4 }, GESTOR), contem('pai de si mesma'));
  await assert.rejects(ferramenta.executar({ demandaId: 4, demandaPaiId: 30 }, GESTOR), contem('ciclo'));
  await assert.rejects(ferramenta.executar({ demandaId: 4, demandaPaiId: 22 }, GESTOR), contem('mesmo projeto'));
  await assert.rejects(ferramenta.executar({ demandaId: 4, demandaPaiId: 21 }, GESTOR), contem('estrutural'));
  assert.equal(propostas.length, 0);
  const livre = criarFerramenta(0, INICIAL);
  await livre.ferramenta.executar({ demandaId: 4, demandaPaiId: 20 }, GESTOR);
  assert.equal(livre.propostas[0].dados['paiNovoNome'], 'Autenticação');
  assert.equal(livre.propostas[0].dados['paiAnteriorNome'], null);
  assert.equal(livre.propostas[0].dados['demandaPaiId'], 20);
});

test('propor mover para o pai que já é o atual não é mudança', async () => {
  const { ferramenta } = criarFerramenta(0, { ...INICIAL, demandaPaiId: 20 });
  await assert.rejects(ferramenta.executar({ demandaId: 4, demandaPaiId: 20 }, GESTOR), BusinessException);
});

test('executar mover confere o ciclo de novo; desfazer devolve o pai de antes', async () => {
  const { servico, demanda, alteracoes } = criarServico({ ...INICIAL, demandaPaiId: 21 });
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  await assert.rejects(executor.executar({ demandaId: 4, demandaPaiId: 30 }, GESTOR), BusinessException);
  assert.deepEqual(alteracoes, []);
  const resultado = await executor.executar({ demandaId: 4, demandaPaiId: 20 }, GESTOR);
  assert.equal(demanda.demandaPaiId, 20);
  assert.equal(resultado['paiAnteriorId'], 21);
  await executor.desfazer(resultado, GESTOR);
  assert.equal(demanda.demandaPaiId, 21);
});

test('desfazer mover de quem estava no topo é recusado com clareza (a service não sabe devolver ao topo) e não altera nada', async () => {
  const { servico, demanda, alteracoes } = criarServico();
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, demandaPaiId: 20 }, GESTOR);
  alteracoes.length = 0;
  await assert.rejects(executor.desfazer(resultado, GESTOR), contem('topo da árvore'));
  assert.deepEqual(alteracoes, []);
  assert.equal(demanda.demandaPaiId, 20);
});

test('a previsão que o pg devolve como Date é lida como o dia certo, na proposta e no desfazer', async () => {
  const { ferramenta, propostas } = criarFerramenta(0, { ...INICIAL, previsaoFimData: new Date(2026, 10, 15) as never });
  await ferramenta.executar({ demandaId: 4, previsaoFimData: '2026-11-30' }, GESTOR);
  assert.equal(propostas[0].dados['previsaoAnteriorData'], '2026-11-15');
  await assert.rejects(ferramenta.executar({ demandaId: 4, previsaoFimData: '2026-11-15' }, GESTOR), BusinessException);

  const { servico, demanda } = criarServico({ ...INICIAL, previsaoFimData: new Date(2026, 10, 15) as never });
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, previsaoFimData: '2026-11-30' }, GESTOR);
  assert.equal(resultado['previsaoAnteriorData'], '2026-11-15');
  demanda.previsaoFimData = new Date(2026, 10, 30) as never;
  await executor.desfazer(resultado, GESTOR);
  assert.equal(demanda.previsaoFimData, '2026-11-15');
});

test('propor acrescentar documentação guarda o texto acrescentado; o executor o junta ao que existe e o desfazer devolve o anterior', async () => {
  const { ferramenta, propostas } = criarFerramenta();
  await ferramenta.executar({ demandaId: 4, acrescentarDocumentacao: '  ## Erros\nMensagens claras.  ' }, GESTOR);
  assert.equal(propostas[0].dados['acrescentarDocumentacao'], '## Erros\nMensagens claras.');

  const { servico, demanda } = criarServico({ ...INICIAL, documentacao: '# Login\nFluxo atual.' });
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, acrescentarDocumentacao: '## Erros\nMensagens claras.' }, GESTOR);
  assert.equal(demanda.documentacao, '# Login\nFluxo atual.\n\n## Erros\nMensagens claras.');
  await executor.desfazer(resultado, GESTOR);
  assert.equal(demanda.documentacao, '# Login\nFluxo atual.');
});

test('acrescentar documentação numa demanda sem documentação cria o texto; desfazer limpa; texto mudado depois bloqueia o desfazer', async () => {
  const { servico, demanda } = criarServico();
  const executor = new AlterarDemandaExecutor(servico, repositorioDeDemanda as never);
  const resultado = await executor.executar({ demandaId: 4, acrescentarDocumentacao: 'Primeira nota.' }, GESTOR);
  assert.equal(demanda.documentacao, 'Primeira nota.');
  demanda.documentacao = 'Primeira nota. Editada por outra pessoa.';
  await assert.rejects(executor.desfazer(resultado, GESTOR), BusinessException);
  demanda.documentacao = 'Primeira nota.';
  await executor.desfazer(resultado, GESTOR);
  assert.equal(demanda.documentacao, null);
});
