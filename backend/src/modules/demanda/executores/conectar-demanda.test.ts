import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { NivelIaEnum, TipoPropostaIaEnum, TipoPromptEnum, TipoUsuarioEnum } from '@project20/shared';
import { BusinessException } from '../../../core/exceptions/business.exception';
import { UnauthorizedAccessException } from '../../../core/exceptions/unauthorized-access.exception';
import { IaService } from '../../ia/services/ia.service';
import { ProjetoService } from '../../projeto/services/projeto.service';
import { PromptService } from '../../prompt/services/prompt.service';
import { PropostaIaService } from '../../proposta-ia/services/proposta-ia.service';
import { DemandaRepository } from '../repositories/demanda.repository';
import { DemandaService } from '../services/demanda.service';
import { ConectarDemandaExecutor } from './conectar-demanda.executor';
import { ProporConectarDemandaFerramenta } from '../ferramentas/propor-conectar-demanda.ferramenta';
import { SugerirConexoesELugarFerramenta } from '../ferramentas/sugerir-conexoes-e-lugar.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function executorComServico(opcoes: { falhaAoCriar?: string } = {}) {
  const criadas: Record<string, unknown>[] = [];
  const excluidas: Record<string, unknown>[] = [];
  const servico = {
    criarConexao: async (dto: Record<string, unknown>) => {
      if (opcoes.falhaAoCriar) throw new BusinessException(opcoes.falhaAoCriar);
      criadas.push(dto);
      return { dados: { id: 44 } };
    },
    excluirConexao: async (dto: Record<string, unknown>) => {
      excluidas.push(dto);
    },
  };
  return { executor: new ConectarDemandaExecutor(servico as unknown as DemandaService), criadas, excluidas };
}

test('cria a conexão pela service (sentido único por padrão) e guarda o que desfaz', async () => {
  const { executor, criadas } = executorComServico();
  const resultado = await executor.executar({ demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'Uma depende da outra' }, GESTOR);
  assert.deepEqual(criadas, [{ demandaOrigemId: 3, demandaDestinoId: 5, ehBidirecional: false }]);
  assert.deepEqual(resultado, { conexaoId: 44, demandaOrigemId: 3, demandaDestinoId: 5 });
});

test('o erro de ciclo (ou conexão repetida) da service chega ao cartão e nada é gravado', async () => {
  const { executor, criadas } = executorComServico({ falhaAoCriar: 'Essa conexão criaria um ciclo no grafo de demandas' });
  await assert.rejects(executor.executar({ demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'tentativa' }, GESTOR), (erro: unknown) =>
    erro instanceof BusinessException && String((erro.getResponse() as { mensagem: string }).mensagem).includes('ciclo'));
  assert.equal(criadas.length, 0);
});

test('desfazer remove a conexão criada; só o gestor cria ou desfaz', async () => {
  const { executor, excluidas } = executorComServico();
  await executor.desfazer({ conexaoId: 44, demandaOrigemId: 3 }, GESTOR);
  assert.deepEqual(excluidas, [{ demandaId: 3, conexaoId: 44 }]);
  await assert.rejects(executor.executar({ demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'tentativa' }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(executor.desfazer({ conexaoId: 44, demandaOrigemId: 3 }, DESENVOLVEDOR), UnauthorizedAccessException);
  await assert.rejects(executor.desfazer({}, GESTOR), BusinessException);
});

test('os dados são validados (motivo curto, campo desconhecido)', () => {
  const { executor } = executorComServico();
  assert.throws(() => executor.validar({ demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'ab' }), BusinessException);
  assert.throws(() => executor.validar({ demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'Faz sentido', status: 'x' }), BusinessException);
});

function ferramentaDeProposta(opcoes: { jaExiste?: boolean; ciclo?: boolean } = {}) {
  const propostas: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }[] = [];
  const propostaIaService = {
    criar: async (dto: { tipo: TipoPropostaIaEnum; dados: Record<string, unknown> }) => {
      propostas.push(dto);
      return { id: 80, status: 'PENDENTE' };
    },
  };
  const repositorio = {
    recuperar: async ({ id }: { id: number }) => (id === 99 ? null : { id, nome: id === 3 ? 'Novo cadastro' : 'Relatório' }),
    validarConexao: async () => opcoes.jaExiste ?? false,
    verificarCriariaCiclo: async () => opcoes.ciclo ?? false,
  };
  return { ferramenta: new ProporConectarDemandaFerramenta(propostaIaService as unknown as PropostaIaService, repositorio as unknown as DemandaRepository), propostas };
}

test('propor conectar só cria a proposta, com os nomes e o sentido único por padrão (ferramenta de gestor)', async () => {
  const { ferramenta, propostas } = ferramentaDeProposta();
  assert.equal(ferramenta.permissao, 'GESTOR');
  const resultado = (await ferramenta.executar({ demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'O relatório lê o cadastro' }, GESTOR)) as { propostaId: number };
  assert.equal(resultado.propostaId, 80);
  assert.equal(propostas[0].tipo, TipoPropostaIaEnum.CONECTAR_DEMANDA);
  assert.deepEqual(propostas[0].dados, { demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'O relatório lê o cadastro', ehBidirecional: false, demandaOrigemNome: 'Novo cadastro', demandaDestinoNome: 'Relatório' });
});

test('propor conectar recusa cedo: mesma demanda, inexistente, conexão repetida e ciclo, sem criar cartão', async () => {
  for (const [opcoes, entrada] of [
    [{}, { demandaOrigemId: 3, demandaDestinoId: 3, motivo: 'a mesma' }],
    [{}, { demandaOrigemId: 3, demandaDestinoId: 99, motivo: 'não existe' }],
    [{ jaExiste: true }, { demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'repetida' }],
    [{ ciclo: true }, { demandaOrigemId: 3, demandaDestinoId: 5, motivo: 'fecharia ciclo' }],
  ] as const) {
    const { ferramenta, propostas } = ferramentaDeProposta(opcoes);
    await assert.rejects(ferramenta.executar({ ...entrada }, GESTOR));
    assert.equal(propostas.length, 0);
  }
});

function ferramentaDeSugestao(resposta: string, nos: { id: number; nome: string; estrutural?: boolean; pai?: number | null }[]) {
  const geradas: { nivel: NivelIaEnum; instrucoes: string; mensagens: { conteudo: unknown }[] }[] = [];
  const tipos: TipoPromptEnum[] = [];
  const demandaService = {
    recuperar: async ({ id }: { id: number }) => ({ dados: { id, nome: `D${id}`, projetoId: 5, demandaPaiId: null, isEstrutural: false, status: 'PLANEJADA', descricaoCliente: `Cliente ${id}`, descricaoTecnica: null } }),
    recuperarGrafo: async () => ({
      dados: {
        nos: nos.map((no) => ({ id: no.id, nome: no.nome, status: 'PLANEJADA', isEstrutural: no.estrutural ?? false, horasEstimadas: 0, minutosExecutados: 0, demandaPaiId: no.pai ?? null, temDescricaoTecnica: false, temDescricaoCliente: false, temDocumentacao: false, tags: [] })),
        arestas: [{ id: 1, origemId: 3, destinoId: 6, tipo: 'conexao', ehBidirecional: false }],
      },
    }),
  };
  const iaService = {
    gerar: async (solicitacao: { nivel: NivelIaEnum; instrucoes: string; mensagens: { conteudo: unknown }[] }) => {
      geradas.push(solicitacao);
      return { texto: resposta };
    },
  };
  const promptService = { obterAtivo: async (tipo: TipoPromptEnum) => (tipos.push(tipo), { conteudo: 'Sugira conexões.' }) };
  const ferramenta = new SugerirConexoesELugarFerramenta(demandaService as unknown as DemandaService, { recuperar: async () => ({ dados: { nome: 'GR' } }) } as unknown as ProjetoService, iaService as unknown as IaService, promptService as unknown as PromptService);
  return { ferramenta, geradas, tipos };
}

test('sugerir é leitura de gestor: analítico, prompt da conexão, só sugestões válidas e nada vira proposta', async () => {
  const resposta = JSON.stringify([
    { tipo: 'CONEXAO', demandaRelacionadaId: 5, ehBidirecional: true, motivo: 'As duas tratam do cadastro de parceiros' },
    { tipo: 'CONEXAO', demandaRelacionadaId: 6, motivo: 'já existe esta conexão' },
    { tipo: 'CONEXAO', demandaRelacionadaId: 77, motivo: 'demanda que não existe' },
    { tipo: 'LUGAR', demandaRelacionadaId: 4, motivo: 'Combina com a estrutura de cadastros' },
  ]);
  const { ferramenta, geradas, tipos } = ferramentaDeSugestao(resposta, [{ id: 3, nome: 'D3' }, { id: 4, nome: 'Cadastros', estrutural: true }, { id: 5, nome: 'D5' }, { id: 6, nome: 'D6' }]);
  assert.equal(ferramenta.tipo, 'LEITURA');
  assert.equal(ferramenta.permissao, 'GESTOR');
  const resultado = await ferramenta.executar({ demandaId: 3 }, GESTOR);
  assert.equal(geradas[0].nivel, NivelIaEnum.ANALITICO);
  assert.deepEqual(tipos, [TipoPromptEnum.CONEXAO_DEMANDA]);
  assert.deepEqual(resultado.sugestoes.map((sugestao) => [sugestao.tipo, sugestao.demandaRelacionadaId, sugestao.ehBidirecional]), [['CONEXAO', 5, true], ['LUGAR', 4, false]]);
  assert.equal(resultado.semSugestoes, false);
  assert.match(String(geradas[0].mensagens[0].conteudo), /#3→#6/);
});

test('sem outra demanda no projeto nem chama o modelo; resposta ilegível dá nenhuma sugestão', async () => {
  const sozinha = ferramentaDeSugestao('[]', [{ id: 3, nome: 'D3' }]);
  const a = await sozinha.ferramenta.executar({ demandaId: 3 }, GESTOR);
  assert.deepEqual([a.sugestoes, a.semSugestoes, sozinha.geradas.length], [[], true, 0]);
  const ilegivel = ferramentaDeSugestao('não sei', [{ id: 3, nome: 'D3' }, { id: 5, nome: 'D5' }]);
  const b = await ilegivel.ferramenta.executar({ demandaId: 3 }, GESTOR);
  assert.deepEqual([b.sugestoes, b.semSugestoes], [[], true]);
});
