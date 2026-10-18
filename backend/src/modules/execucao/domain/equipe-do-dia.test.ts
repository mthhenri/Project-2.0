import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AtividadeEmAberto, ExecucaoDeAlguem, agruparExecucoesPorPessoa, calcularAtividadesParadas } from './equipe-do-dia';

function execucao(usuarioId: number, usuario: string, inicio: string, minutos: number | null, fim: string | null = '2026-10-19T15:00:00Z'): ExecucaoDeAlguem {
  return { usuarioId, usuario, atividade: 'Ajustar login', demanda: 'Autenticação', projeto: 'Loja', descricao: 'x', inicio: new Date(inicio), fim: fim ? new Date(fim) : null, minutos };
}

test('agrupa por pessoa, soma os minutos e ordena por nome', () => {
  const pessoas = agruparExecucoesPorPessoa([
    execucao(2, 'Zélia', '2026-10-19T12:00:00Z', 30),
    execucao(1, 'Ana', '2026-10-19T13:00:00Z', 45),
    execucao(1, 'Ana', '2026-10-19T11:00:00Z', 15),
  ]);
  assert.deepEqual(pessoas.map((pessoa) => [pessoa.usuario, pessoa.totalMinutos, pessoa.execucoes.length]), [['Ana', 60, 2], ['Zélia', 30, 1]]);
  assert.equal(pessoas[0].execucoes[0].inicio, '2026-10-19T11:00:00.000Z');
});

test('execução em andamento entra sem somar minutos', () => {
  const [pessoa] = agruparExecucoesPorPessoa([execucao(1, 'Ana', '2026-10-19T12:00:00Z', null, null)]);
  assert.equal(pessoa.totalMinutos, 0);
  assert.equal(pessoa.execucoes[0].fim, null);
});

const AGORA = new Date('2026-10-19T12:00:00Z');

function atividade(id: number, criadaEm: string, emExecucao = false): AtividadeEmAberto {
  return { id, nome: `Atividade ${id}`, usuario: 'Ana', demanda: 'Autenticação', projeto: 'Loja', emExecucao, criadaEm: new Date(criadaEm) };
}

test('atividade parada: última execução antiga ou, sem execução, criação antiga; a mais parada primeiro', () => {
  const paradas = calcularAtividadesParadas({
    atividades: [atividade(1, '2026-10-01T00:00:00Z'), atividade(2, '2026-10-01T00:00:00Z'), atividade(3, '2026-10-18T00:00:00Z')],
    ultimaExecucao: new Map([[1, new Date('2026-10-10T12:00:00Z')]]),
    agora: AGORA,
    diasParada: 3,
  });
  assert.deepEqual(paradas.map((parada) => [parada.id, parada.diasSemExecucao, parada.nuncaExecutada]), [[2, 18, true], [1, 9, false]]);
});

test('atividade em execução, ou com execução recente, não está parada', () => {
  const paradas = calcularAtividadesParadas({
    atividades: [atividade(1, '2026-10-01T00:00:00Z', true), atividade(2, '2026-10-01T00:00:00Z')],
    ultimaExecucao: new Map([[2, new Date('2026-10-19T09:00:00Z')]]),
    agora: AGORA,
    diasParada: 3,
  });
  assert.deepEqual(paradas, []);
});
