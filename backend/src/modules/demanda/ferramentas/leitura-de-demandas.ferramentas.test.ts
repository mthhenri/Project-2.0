import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TipoDemandaStatusEnum, TipoUsuarioEnum } from '@project20/shared';
import { DemandaService } from '../services/demanda.service';
import { ConsultarGrafoDoProjetoFerramenta, LIMITE_DEMANDAS_DO_GRAFO } from './consultar-grafo-do-projeto.ferramenta';
import { LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA, ListarDemandasDoProjetoFerramenta } from './listar-demandas-do-projeto.ferramenta';

const GESTOR = { sub: 1, login: 'g', tipo: TipoUsuarioEnum.GESTOR } as never;
const DESENVOLVEDOR = { sub: 3, login: 'd', tipo: TipoUsuarioEnum.DESENVOLVEDOR } as never;

function no(id: number, sobrescrita: Record<string, unknown> = {}) {
  return {
    id, nome: `D${id}`, status: TipoDemandaStatusEnum.PENDENTE, isEstrutural: false, horasEstimadas: 4, minutosExecutados: 90, demandaPaiId: null,
    temDescricaoTecnica: true, temDescricaoCliente: false, temDocumentacao: false, tags: [{ id: 1, nome: 'Backend', cor: '#112233' }], ...sobrescrita,
  };
}

// ---------------------------------------------------------------------------
// consultar_grafo_do_projeto
// ---------------------------------------------------------------------------

test('consultar grafo: pede à service com o usuário do token e resume cada demanda (horas executadas com uma casa, tags por nome)', async () => {
  const chamadas: Array<{ dto: unknown; usuario: unknown }> = [];
  const servico = { recuperarGrafo: async (dto: unknown, usuario: unknown) => { chamadas.push({ dto, usuario }); return { dados: { nos: [no(1, { demandaPaiId: 9 })], arestas: [] } }; } };
  const resultado = await new ConsultarGrafoDoProjetoFerramenta(servico as unknown as DemandaService).executar({ projetoId: 7 }, GESTOR);

  assert.deepEqual(chamadas, [{ dto: { projetoId: 7 }, usuario: GESTOR }]);
  assert.deepEqual(resultado.demandas[0], {
    id: 1, nome: 'D1', status: 'PENDENTE', isEstrutural: false, paiId: 9, horasEstimadas: 4, horasExecutadas: 1.5,
    temDescricaoTecnica: true, temDescricaoCliente: false, tags: ['Backend'],
  });
  assert.equal(resultado.projetoId, 7);
});

test('consultar grafo: devolve só as conexões (a hierarquia já está no paiId), com bidirecional', async () => {
  const arestas = [
    { id: 1, origemId: 1, destinoId: 2, tipo: 'conexao', ehBidirecional: true },
    { id: 2, origemId: 3, destinoId: 4, tipo: 'conexao', ehBidirecional: false },
    { id: 3, origemId: 1, destinoId: 5, tipo: 'hierarquia', ehBidirecional: false },
  ];
  const servico = { recuperarGrafo: async () => ({ dados: { nos: [no(1)], arestas } }) };
  const resultado = await new ConsultarGrafoDoProjetoFerramenta(servico as unknown as DemandaService).executar({ projetoId: 7 }, GESTOR);
  assert.deepEqual(resultado.conexoes, [{ origemId: 1, destinoId: 2, bidirecional: true }, { origemId: 3, destinoId: 4, bidirecional: false }]);
});

test('consultar grafo: limita as demandas e avisa que há mais; a ferramenta é só do gestor e de leitura', async () => {
  const nos = Array.from({ length: LIMITE_DEMANDAS_DO_GRAFO + 5 }, (_, indice) => no(indice + 1));
  const servico = { recuperarGrafo: async () => ({ dados: { nos, arestas: [] } }) };
  const ferramenta = new ConsultarGrafoDoProjetoFerramenta(servico as unknown as DemandaService);
  const resultado = await ferramenta.executar({ projetoId: 7 }, GESTOR);
  assert.equal(resultado.demandas.length, LIMITE_DEMANDAS_DO_GRAFO);
  assert.deepEqual([resultado.totalDemandas, resultado.haMaisDemandas], [LIMITE_DEMANDAS_DO_GRAFO + 5, true]);
  assert.deepEqual([ferramenta.permissao, ferramenta.tipo], ['GESTOR', 'LEITURA']);
});

test('consultar grafo: projeto sem demandas devolve listas vazias', async () => {
  const servico = { recuperarGrafo: async () => ({ dados: null }) };
  const resultado = await new ConsultarGrafoDoProjetoFerramenta(servico as unknown as DemandaService).executar({ projetoId: 7 }, GESTOR);
  assert.deepEqual([resultado.demandas, resultado.conexoes, resultado.totalDemandas, resultado.haMaisDemandas], [[], [], 0, false]);
});

// ---------------------------------------------------------------------------
// listar_demandas_do_projeto
// ---------------------------------------------------------------------------

test('listar demandas do projeto: usa a service com o usuário do token (as mesmas regras da tela) e pede todas as linhas', async () => {
  const chamadas: Array<{ filtros: unknown; usuario: unknown }> = [];
  const servico = { listar: async (filtros: unknown, usuario: unknown) => { chamadas.push({ filtros, usuario }); return { dados: { itens: [] } }; } };
  const ferramenta = new ListarDemandasDoProjetoFerramenta(servico as unknown as DemandaService);
  await ferramenta.executar({ projetoId: 7 }, DESENVOLVEDOR);
  assert.deepEqual(chamadas, [{ filtros: { projetoId: 7, allRows: true }, usuario: DESENVOLVEDOR }]);
  assert.deepEqual([ferramenta.permissao, ferramenta.tipo], ['QUALQUER', 'LEITURA']);
});

test('listar demandas do projeto: devolve só id, nome, caminho, estrutural e status', async () => {
  const itens = [{ id: 1, nome: 'Folha', caminho: 'Raiz > Folha', isEstrutural: false, status: 'PENDENTE', horasEstimadas: 8 }];
  const servico = { listar: async () => ({ dados: { itens } }) };
  const resultado = await new ListarDemandasDoProjetoFerramenta(servico as unknown as DemandaService).executar({ projetoId: 7 }, GESTOR);
  assert.deepEqual(resultado.demandas, [{ id: 1, nome: 'Folha', caminho: 'Raiz > Folha', isEstrutural: false, status: 'PENDENTE' }]);
});

test('listar demandas do projeto: limita a resposta e avisa que há mais', async () => {
  const itens = Array.from({ length: LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA + 3 }, (_, indice) => ({ id: indice + 1, nome: `D${indice}`, caminho: `D${indice}`, isEstrutural: false, status: 'PENDENTE' }));
  const servico = { listar: async () => ({ dados: { itens } }) };
  const resultado = await new ListarDemandasDoProjetoFerramenta(servico as unknown as DemandaService).executar({ projetoId: 7 }, GESTOR);
  assert.equal(resultado.demandas.length, LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA);
  assert.deepEqual([resultado.total, resultado.haMais], [LIMITE_DEMANDAS_DO_PROJETO_DA_FERRAMENTA + 3, true]);
});
