import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { AtividadeLida, ExecucaoLida, calcularMudancasDaQueda } from './mudancas-da-queda';

const DESDE = new Date('2026-10-19T12:00:00Z');

function execucao(inicio: string, fim: string | null, atividade = 'Ajustar login'): ExecucaoLida {
  return { atividade, demanda: 'Autenticação', descricao: 'x', inicio: new Date(inicio), fim: fim ? new Date(fim) : null };
}

function atividade(criadaEm: string): AtividadeLida {
  return { nome: 'Nova', demanda: 'Autenticação', criadaEm: new Date(criadaEm) };
}

test('execução iniciada depois do instante é uma mudança, e a que segue em andamento é a ativa', () => {
  const resultado = calcularMudancasDaQueda({ desde: DESDE, execucoes: [execucao('2026-10-19T12:30:00Z', null)], atividades: [] });
  assert.equal(resultado.execucoesIniciadas.length, 1);
  assert.equal(resultado.execucaoAtiva?.atividade, 'Ajustar login');
  assert.equal(resultado.execucoesEncerradas.length, 0);
  assert.equal(resultado.semMudancas, false);
});

test('execução que começou antes mas terminou depois do instante conta como encerrada', () => {
  const resultado = calcularMudancasDaQueda({ desde: DESDE, execucoes: [execucao('2026-10-19T11:00:00Z', '2026-10-19T12:10:00Z')], atividades: [] });
  assert.equal(resultado.execucoesIniciadas.length, 0);
  assert.equal(resultado.execucoesEncerradas.length, 1);
  assert.equal(resultado.execucaoAtiva, null);
});

test('execução anterior ao instante e já encerrada não é mudança', () => {
  const resultado = calcularMudancasDaQueda({ desde: DESDE, execucoes: [execucao('2026-10-19T09:00:00Z', '2026-10-19T10:00:00Z')], atividades: [] });
  assert.equal(resultado.semMudancas, true);
});

test('atividades criadas depois do instante entram; as anteriores não', () => {
  const resultado = calcularMudancasDaQueda({ desde: DESDE, execucoes: [], atividades: [atividade('2026-10-19T13:00:00Z'), atividade('2026-10-18T13:00:00Z')] });
  assert.equal(resultado.atividadesCriadas.length, 1);
  assert.equal(resultado.atividadesCriadas[0].criadaEm, '2026-10-19T13:00:00.000Z');
  assert.equal(resultado.semMudancas, false);
});

test('a execução em andamento que já existia antes do instante não é mudança, mas continua sendo a ativa', () => {
  const resultado = calcularMudancasDaQueda({ desde: DESDE, execucoes: [execucao('2026-10-19T11:00:00Z', null)], atividades: [] });
  assert.equal(resultado.semMudancas, true);
  assert.notEqual(resultado.execucaoAtiva, null);
});
