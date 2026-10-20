import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { formatarDolar, formatarTokens, montarCategoriasDeCusto, rotuloDoRecorte } from './custos.util';

const normalizar = (texto: string) => texto.replace(/ /g, ' ');

test('formatarDolar usa duas casas e quatro para o valor pequeno mas não nulo', () => {
  assert.equal(normalizar(formatarDolar(1234.5)), 'US$ 1.234,50');
  assert.equal(normalizar(formatarDolar(0)), 'US$ 0,00');
  assert.equal(normalizar(formatarDolar(0.0042)), 'US$ 0,0042');
});

test('formatarTokens abrevia em mil e em milhões', () => {
  assert.equal(formatarTokens(950), '950');
  assert.equal(formatarTokens(12_345), '12,3 mil');
  assert.equal(formatarTokens(4_560_000), '4,56 mi');
});

test('rotuloDoRecorte mostra o mês por extenso ou só o ano', () => {
  assert.equal(rotuloDoRecorte(2026, 10), 'outubro de 2026');
  assert.equal(rotuloDoRecorte(2026, null), '2026');
});

test('montarCategoriasDeCusto: dia no recorte de mês, mês abreviado no de ano, sem rótulo de valor no período sem custo', () => {
  const [dia, vazio] = montarCategoriasDeCusto([
    { periodo: '2026-10-05', mensagens: 1, tokens: 1500, custoDolar: 1.5 },
    { periodo: '2026-10-06', mensagens: 0, tokens: 0, custoDolar: 0 },
  ]);
  assert.equal(dia.rotulo, '5');
  assert.equal(dia.barras[0].valor, 1.5);
  assert.equal(normalizar(dia.barras[0].rotulo), '1,50');
  assert.match(dia.barras[0].descricao, /5 de outubro: .*1,50 em 1 mensagem da IA \(1\.500 tokens\)/);
  assert.equal(vazio.barras[0].rotulo, '');

  const [mes] = montarCategoriasDeCusto([{ periodo: '2026-03', mensagens: 2, tokens: 10, custoDolar: 2 }]);
  assert.equal(mes.rotulo, 'Mar');
  assert.equal(mes.descricao, 'março de 2026');
});
