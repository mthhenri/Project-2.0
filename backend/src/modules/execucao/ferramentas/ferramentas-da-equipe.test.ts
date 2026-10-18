import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoUsuarioEnum } from '@project20/shared';
import { ConfigService } from '../../../config/config.service';
import { AtividadeService } from '../../atividade/services/atividade.service';
import { ConsultarDemandaFerramenta, LIMITE_DE_TEXTO_DA_DEMANDA } from '../../atividade/ferramentas/consultar-demanda.ferramenta';
import { ConsultarGrafoDoProjetoFerramenta, LIMITE_DEMANDAS_DO_GRAFO } from '../../demanda/ferramentas/consultar-grafo-do-projeto.ferramenta';
import { DemandaService } from '../../demanda/services/demanda.service';
import { FerramentaIaRegistro } from '../../ferramenta-ia/services/ferramenta-ia.registro';
import { ExecucaoService } from '../services/execucao.service';
import { LIMITE_EXECUCOES_DA_EQUIPE, ListarExecucoesDaEquipeFerramenta } from './listar-execucoes-da-equipe.ferramenta';
import { DIAS_PARADA_PADRAO, LIMITE_ATIVIDADES_PARADAS, ListarAtividadesParadasFerramenta } from './listar-atividades-paradas.ferramenta';

const GESTOR = { sub: 1, login: 'gestor', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 7, login: 'dev', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;
const configService = { obter: () => ({ aplicacao: { fusoHorario: 'America/Sao_Paulo' } }) } as unknown as ConfigService;

class EquipeDoDia extends ListarExecucoesDaEquipeFerramenta {
  protected agora(): Date {
    return new Date('2026-10-19T15:00:00Z');
  }
}
class ParadasComAgora extends ListarAtividadesParadasFerramenta {
  protected agora(): Date {
    return new Date('2026-10-19T12:00:00Z');
  }
}

function execucaoItem(id: number, usuarioId: number, nomeUsuario: string, minutos: number) {
  return { id, usuarioId, nomeUsuario, nomeAtividade: 'Ajustar login', nomeDemanda: 'Autenticação', nomeProjeto: 'Loja', descricao: 'x', inicioData: new Date('2026-10-19T12:00:00Z'), fimData: new Date('2026-10-19T13:00:00Z'), duracaoMinutos: minutos };
}

function montarEquipe(itens: ReturnType<typeof execucaoItem>[], total = itens.length) {
  const chamadas: { filtros: Record<string, unknown>; usuario: unknown }[] = [];
  const servico = {
    listar: async (filtros: Record<string, unknown>, usuario: unknown) => {
      chamadas.push({ filtros, usuario });
      return { dados: { itens, totalItens: total } };
    },
  };
  return { ferramenta: new EquipeDoDia(servico as unknown as ExecucaoService, configService), chamadas };
}

test('as ferramentas da equipe são só do gestor: o desenvolvedor não as enxerga', () => {
  const registro = new FerramentaIaRegistro();
  const servicoVazio = {} as never;
  const ferramentas = [
    new ListarExecucoesDaEquipeFerramenta(servicoVazio, configService),
    new ListarAtividadesParadasFerramenta(servicoVazio, servicoVazio),
    new ConsultarGrafoDoProjetoFerramenta(servicoVazio),
    new ConsultarDemandaFerramenta(servicoVazio, servicoVazio),
  ];
  ferramentas.forEach((ferramenta) => registro.registrar(ferramenta));
  assert.deepEqual(registro.listarParaUsuario(DESENVOLVEDOR), []);
  assert.deepEqual(registro.listarParaUsuario(GESTOR).map((item) => item.nome).sort(), [
    'consultar_demanda',
    'consultar_grafo_do_projeto',
    'listar_atividades_paradas',
    'listar_execucoes_da_equipe_no_dia',
  ]);
});

test('execuções da equipe: sem filtro de usuário, do dia pedido (ou hoje), agrupadas por pessoa', async () => {
  const { ferramenta, chamadas } = montarEquipe([execucaoItem(1, 2, 'Bia', 30), execucaoItem(2, 3, 'Ana', 60), execucaoItem(3, 3, 'Ana', 15)]);
  const hoje = await ferramenta.executar({}, GESTOR);
  assert.equal(hoje.data, '2026-10-19');
  assert.deepEqual(hoje.pessoas.map((pessoa) => [pessoa.usuario, pessoa.totalMinutos]), [['Ana', 75], ['Bia', 30]]);
  assert.equal(chamadas[0].filtros['usuarioId'], undefined);
  assert.equal(chamadas[0].usuario, GESTOR);
  await ferramenta.executar({ data: '2026-10-16' }, GESTOR);
  assert.equal(chamadas[1].filtros['data'], '2026-10-16');
});

test('execuções da equipe: limita a leitura e avisa que há mais', async () => {
  const { ferramenta, chamadas } = montarEquipe([execucaoItem(1, 2, 'Bia', 30)], LIMITE_EXECUCOES_DA_EQUIPE + 10);
  const resultado = await ferramenta.executar({}, GESTOR);
  assert.equal(chamadas[0].filtros['itensPorPagina'], LIMITE_EXECUCOES_DA_EQUIPE);
  assert.equal(resultado.haMais, true);
});

function atividadeLista(id: number, criada: string, execucaoAtivaId: number | null = null) {
  return { id, nome: `Atividade ${id}`, nomeUsuario: 'Ana', nomeDemanda: 'Autenticação', nomeProjeto: 'Loja', execucaoAtivaId, createdDate: new Date(criada) };
}

function montarParadas(atividades: ReturnType<typeof atividadeLista>[], ultimas: { atividadeId: number; ultimaData: Date }[] = []) {
  const consultas: Record<string, unknown>[] = [];
  const atividadeService = {
    listar: async (filtros: Record<string, unknown>) => {
      consultas.push(filtros);
      return { dados: { itens: atividades } };
    },
  };
  const execucaoService = { listarUltimaPorAtividade: async () => ({ dados: ultimas }) };
  return { ferramenta: new ParadasComAgora(atividadeService as unknown as AtividadeService, execucaoService as unknown as ExecucaoService), consultas };
}

test('atividades paradas: só em desenvolvimento, com os filtros da demanda e da pessoa, e o padrão de 3 dias', async () => {
  const { ferramenta, consultas } = montarParadas([atividadeLista(1, '2026-10-01T00:00:00Z'), atividadeLista(2, '2026-10-19T08:00:00Z'), atividadeLista(3, '2026-10-01T00:00:00Z', 55)]);
  const resultado = await ferramenta.executar({ demandaId: 9, usuarioId: 4 }, GESTOR);
  assert.deepEqual(consultas[0]['status'], ['DESENVOLVENDO']);
  assert.equal(consultas[0]['demandaId'], 9);
  assert.equal(consultas[0]['usuarioId'], 4);
  assert.equal(resultado.diasParada, DIAS_PARADA_PADRAO);
  assert.deepEqual(resultado.atividades.map((atividade) => atividade.id), [1]);
});

test('atividades paradas: limita o que devolve', async () => {
  const muitas = Array.from({ length: LIMITE_ATIVIDADES_PARADAS + 5 }, (_, i) => atividadeLista(i + 1, '2026-09-01T00:00:00Z'));
  const { ferramenta } = montarParadas(muitas);
  const resultado = await ferramenta.executar({ diasParada: 7 }, GESTOR);
  assert.equal(resultado.atividades.length, LIMITE_ATIVIDADES_PARADAS);
  assert.equal(resultado.total, LIMITE_ATIVIDADES_PARADAS + 5);
  assert.equal(resultado.haMais, true);
});

test('grafo do projeto: demandas com o pai e as horas, só as conexões (a hierarquia vai em paiId) e limite', async () => {
  const nos = Array.from({ length: LIMITE_DEMANDAS_DO_GRAFO + 3 }, (_, i) => ({
    id: i + 1, nome: `D${i + 1}`, status: 'PLANEJADA', isEstrutural: i === 0, horasEstimadas: 8, minutosExecutados: 90, demandaPaiId: i === 0 ? null : 1,
    temDescricaoTecnica: true, temDescricaoCliente: false, temDocumentacao: false, tags: [{ id: 1, nome: 'api', cor: '#000000' }],
  }));
  const chamadas: unknown[] = [];
  const servico = {
    recuperarGrafo: async (dto: unknown, usuario: unknown) => {
      chamadas.push([dto, usuario]);
      return { dados: { nos, arestas: [{ id: 1, origemId: 1, destinoId: 2, tipo: 'hierarquia', ehBidirecional: false }, { id: 2, origemId: 2, destinoId: 3, tipo: 'conexao', ehBidirecional: true }] } };
    },
  };
  const resultado = await new ConsultarGrafoDoProjetoFerramenta(servico as unknown as DemandaService).executar({ projetoId: 5 }, GESTOR);
  assert.deepEqual(chamadas[0], [{ projetoId: 5 }, GESTOR]);
  assert.equal(resultado.demandas.length, LIMITE_DEMANDAS_DO_GRAFO);
  assert.equal(resultado.haMaisDemandas, true);
  assert.equal(resultado.demandas[1].paiId, 1);
  assert.equal(resultado.demandas[0].horasExecutadas, 1.5);
  assert.deepEqual(resultado.demandas[0].tags, ['api']);
  assert.deepEqual(resultado.conexoes, [{ origemId: 2, destinoId: 3, bidirecional: true }]);
});

test('consultar demanda: descrições, tags e atividades, com os textos longos cortados', async () => {
  const demanda = { id: 3, nome: 'Autenticação', projetoId: 5, demandaPaiId: null, isEstrutural: false, status: 'PLANEJADA', horasEstimadas: 16, previsaoFimData: null, descricaoTecnica: 'x'.repeat(LIMITE_DE_TEXTO_DA_DEMANDA + 50), descricaoCliente: 'Login com e-mail', documentacao: null };
  const demandaService = {
    recuperar: async () => ({ dados: demanda }),
    listarTagsDemanda: async () => ({ dados: [{ id: 1, nome: 'api', cor: '#000000' }] }),
  };
  const atividadeService = {
    listar: async () => ({ dados: { itens: [{ id: 9, nome: 'Ajustar login', status: 'DESENVOLVENDO', nomeUsuario: 'Ana', totalMinutosExecutados: 120, execucaoAtivaId: null }], totalItens: 1 } }),
  };
  const resultado = await new ConsultarDemandaFerramenta(demandaService as unknown as DemandaService, atividadeService as unknown as AtividadeService).executar({ demandaId: 3 }, GESTOR);
  assert.equal(resultado.descricaoTecnica?.length, LIMITE_DE_TEXTO_DA_DEMANDA);
  assert.equal(resultado.textoCortado, true);
  assert.equal(resultado.descricaoCliente, 'Login com e-mail');
  assert.deepEqual(resultado.tags, ['api']);
  assert.deepEqual(resultado.atividades, [{ id: 9, nome: 'Ajustar login', status: 'DESENVOLVENDO', usuario: 'Ana', minutosExecutados: 120, emExecucao: false }]);
  assert.equal(resultado.haMaisAtividades, false);
});
