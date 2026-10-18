import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DemandaDoGrafoDto } from '@project20/shared';
import { MAXIMO_DE_SUGESTOES_DE_CONEXAO, descendentesDe, filtrarSugestoes, interpretarSugestoesDeConexao, montarContextoDaAnalise } from './sugestoes-de-conexao';

function demanda(id: number, paiId: number | null, isEstrutural = false): DemandaDoGrafoDto {
  return { id, nome: `D${id}`, status: 'PLANEJADA', isEstrutural, paiId, horasEstimadas: 0, horasExecutadas: 0, temDescricaoTecnica: false, temDescricaoCliente: false, tags: [] };
}

// 1 (estrutura) > 2 (estrutura) > 3 ; 4 (estrutura) ; 5 trabalho solto
const DEMANDAS = [demanda(1, null, true), demanda(2, 1, true), demanda(3, 2), demanda(4, null, true), demanda(5, null)];

test('lê o array JSON com ou sem cercas e ignora o que não é lista', () => {
  assert.equal(interpretarSugestoesDeConexao('```json\n[{"tipo":"CONEXAO","demandaRelacionadaId":5,"motivo":"depende"}]\n```').length, 1);
  assert.deepEqual(interpretarSugestoesDeConexao('não sei'), []);
  assert.deepEqual(interpretarSugestoesDeConexao('{"a":1}'), []);
  assert.deepEqual(interpretarSugestoesDeConexao('[quebrado'), []);
});

test('descendentes: tudo que está abaixo, em qualquer nível', () => {
  assert.deepEqual([...descendentesDe(1, DEMANDAS)].sort(), [2, 3]);
  assert.deepEqual([...descendentesDe(3, DEMANDAS)], []);
});

test('conexão válida passa; a própria demanda, id inexistente, tipo inválido e motivo vazio saem', () => {
  const brutas = [
    { tipo: 'CONEXAO', demandaRelacionadaId: 5, ehBidirecional: true, motivo: 'Uma depende da outra' },
    { tipo: 'CONEXAO', demandaRelacionadaId: 3, motivo: 'a própria' },
    { tipo: 'CONEXAO', demandaRelacionadaId: 99, motivo: 'não existe' },
    { tipo: 'OUTRO', demandaRelacionadaId: 4, motivo: 'tipo errado' },
    { tipo: 'CONEXAO', demandaRelacionadaId: 4, motivo: '  ' },
  ];
  const validas = filtrarSugestoes({ brutas, demandaId: 3, demandas: DEMANDAS, conexoesExistentes: [] });
  assert.deepEqual(validas.map((sugestao) => [sugestao.tipo, sugestao.demandaRelacionadaId, sugestao.ehBidirecional, sugestao.demandaRelacionadaNome]), [['CONEXAO', 5, true, 'D5']]);
});

test('conexão que já existe, em qualquer sentido, não é sugerida de novo', () => {
  const brutas = [{ tipo: 'CONEXAO', demandaRelacionadaId: 5, motivo: 'já ligadas' }, { tipo: 'CONEXAO', demandaRelacionadaId: 4, motivo: 'nova ligação' }];
  const validas = filtrarSugestoes({ brutas, demandaId: 3, demandas: DEMANDAS, conexoesExistentes: [{ origemId: 5, destinoId: 3 }] });
  assert.deepEqual(validas.map((sugestao) => sugestao.demandaRelacionadaId), [4]);
});

test('lugar: só demanda de estrutura que não é o pai atual nem está abaixo da própria demanda', () => {
  const brutas = [
    { tipo: 'LUGAR', demandaRelacionadaId: 4, motivo: 'Combina mais com esta estrutura' },
    { tipo: 'LUGAR', demandaRelacionadaId: 2, motivo: 'já é o pai atual' },
    { tipo: 'LUGAR', demandaRelacionadaId: 5, motivo: 'não é de estrutura' },
  ];
  const validas = filtrarSugestoes({ brutas, demandaId: 3, demandas: DEMANDAS, conexoesExistentes: [] });
  assert.deepEqual(validas.map((sugestao) => sugestao.demandaRelacionadaId), [4]);
  const dentroDeSi = filtrarSugestoes({ brutas: [{ tipo: 'LUGAR', demandaRelacionadaId: 2, motivo: 'embaixo da filha' }], demandaId: 1, demandas: DEMANDAS, conexoesExistentes: [] });
  assert.deepEqual(dentroDeSi, []);
});

test('sem repetidas e no máximo cinco sugestões', () => {
  const muitas = Array.from({ length: 12 }, (_, i) => demanda(100 + i, null));
  const brutas = [...muitas, muitas[0]].map((alvo) => ({ tipo: 'CONEXAO', demandaRelacionadaId: alvo.id, motivo: 'relacionadas' }));
  const validas = filtrarSugestoes({ brutas, demandaId: 5, demandas: [...DEMANDAS, ...muitas], conexoesExistentes: [] });
  assert.equal(validas.length, MAXIMO_DE_SUGESTOES_DE_CONEXAO);
  assert.equal(new Set(validas.map((sugestao) => sugestao.demandaRelacionadaId)).size, MAXIMO_DE_SUGESTOES_DE_CONEXAO);
});

test('o contexto traz a demanda alvo, as conexões que ela já tem e uma linha por outra demanda', () => {
  const texto = montarContextoDaAnalise({
    projeto: 'GR',
    alvo: { id: 3, nome: 'Novo cadastro', paiId: 2, isEstrutural: false, status: 'PLANEJADA', descricao: null, descricaoCliente: 'Cadastro de parceiros', descricaoTecnica: null },
    outras: [{ id: 5, nome: 'Relatório', paiId: null, isEstrutural: false, status: 'PLANEJADA', descricao: 'x'.repeat(500) }],
    conexoesDoAlvo: [{ origemId: 3, destinoId: 4 }],
  });
  assert.match(texto, /#3 "Novo cadastro"/);
  assert.match(texto, /Cadastro de parceiros/);
  assert.match(texto, /#3→#4/);
  assert.match(texto, /#5 "Relatório"[^\n]*…/);
});
