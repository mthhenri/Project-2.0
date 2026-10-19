import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { RelatorioPeriodoTipoEnum } from '@project20/shared';
import { atalhoDoPeriodo, normalizarSeveridade, ordemSeveridade, periodoDoAtalho } from './relatorio.util';

// `hoje` é `Date` local (como o `hojeNoFuso` entrega); meses do `Date` começam em 0.
const OUTUBRO_2026 = new Date(2026, 9, 19);
const JANEIRO_2026 = new Date(2026, 0, 10);

test('periodoDoAtalho: "Este mês" é o mês corrente, "Este ano" o ano corrente e "Personalizado" mantém ano e mês', () => {
  assert.deepEqual(periodoDoAtalho('MES', OUTUBRO_2026), { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2026, mes: 10 });
  assert.deepEqual(periodoDoAtalho('ANO', OUTUBRO_2026), { periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: 2026, mes: 10 });
  assert.deepEqual(periodoDoAtalho('CUSTOM', OUTUBRO_2026), { periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, ano: 2026, mes: 10 });
});

test('periodoDoAtalho: "Mês passado" volta um mês e, em janeiro, vira dezembro do ano anterior', () => {
  assert.deepEqual(periodoDoAtalho('PASSADO', OUTUBRO_2026), { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2026, mes: 9 });
  assert.deepEqual(periodoDoAtalho('PASSADO', JANEIRO_2026), { periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano: 2025, mes: 12 });
});

test('atalhoDoPeriodo: reconhece cada atalho a partir da seleção', () => {
  const mensal = (ano: number, mes: number) => ({ periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano, mes });
  assert.equal(atalhoDoPeriodo(mensal(2026, 10), OUTUBRO_2026), 'MES');
  assert.equal(atalhoDoPeriodo(mensal(2026, 9), OUTUBRO_2026), 'PASSADO');
  assert.equal(atalhoDoPeriodo(mensal(2025, 12), JANEIRO_2026), 'PASSADO');
  assert.equal(atalhoDoPeriodo({ periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: 2026, mes: 3 }, OUTUBRO_2026), 'ANO');
  assert.equal(atalhoDoPeriodo({ periodoTipo: RelatorioPeriodoTipoEnum.CUSTOM, ano: 2026, mes: 10 }, OUTUBRO_2026), 'CUSTOM');
});

test('atalhoDoPeriodo: ajuste fino (outro mês ou outro ano) não corresponde a atalho', () => {
  const mensal = (ano: number, mes: number) => ({ periodoTipo: RelatorioPeriodoTipoEnum.MENSAL, ano, mes });
  assert.equal(atalhoDoPeriodo(mensal(2026, 3), OUTUBRO_2026), null);
  assert.equal(atalhoDoPeriodo(mensal(2025, 10), OUTUBRO_2026), null);
  assert.equal(atalhoDoPeriodo({ periodoTipo: RelatorioPeriodoTipoEnum.ANUAL, ano: 2024, mes: 10 }, OUTUBRO_2026), null);
});

test('normalizarSeveridade: ignora acento, caixa e espaços; nulo vira vazio', () => {
  assert.equal(normalizarSeveridade('Média'), 'MEDIA');
  assert.equal(normalizarSeveridade(' média '), 'MEDIA');
  assert.equal(normalizarSeveridade('alta'), 'ALTA');
  assert.equal(normalizarSeveridade(null), '');
  assert.equal(normalizarSeveridade(undefined), '');
});

test('ordemSeveridade: ALTA, MÉDIA, BAIXA e, no fim, o que a IA inventar', () => {
  const ordenadas = ['baixa', 'Média', 'ALTA', 'crítica', null].sort((a, b) => ordemSeveridade(a) - ordemSeveridade(b));
  assert.deepEqual(ordenadas.slice(0, 3), ['ALTA', 'Média', 'baixa']);
  assert.equal(ordemSeveridade('crítica'), 3);
  assert.equal(ordemSeveridade(null), 3);
});
