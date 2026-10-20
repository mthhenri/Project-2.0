import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { formatarDolar, formatarTokens, montarCategoriasDeCusto, ModeloDeCusto, montarLegendaDeCusto, provedorDoModelo, rotuloDoRecorte } from './custos.util';

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
    { periodo: '2026-10-05', mensagens: 1, tokens: 1500, custoDolar: 1.5, modelos: [{ modelo: 'claude-a', mensagens: 1, tokens: 1500, custoDolar: 1.5 }] },
    { periodo: '2026-10-06', mensagens: 0, tokens: 0, custoDolar: 0, modelos: [] },
  ]);
  assert.equal(dia.rotulo, '5');
  assert.equal(dia.barras[0].valor, 1.5);
  assert.equal(normalizar(dia.barras[0].rotulo), '1,50');
  assert.match(dia.descricao ?? '', /5 de outubro: .*1,50 em 1 mensagem da IA \(1\.500 tokens\)/);
  assert.match(dia.barras[0].descricao, /5 de outubro · claude-a: .*1,50 em 1 mensagem \(1\.500 tokens\)/);
  assert.deepEqual(vazio.barras, []);

  const [mes] = montarCategoriasDeCusto([{ periodo: '2026-03', mensagens: 2, tokens: 10, custoDolar: 2, modelos: [] }]);
  assert.equal(mes.rotulo, 'Mar');
  assert.match(mes.descricao ?? '', /^março de 2026: .*2,00 em 2 mensagens da IA/);
});

test('provedorDoModelo reconhece Anthropic, Google e OpenAI pelo nome', () => {
  assert.equal(provedorDoModelo('claude-sonnet-5-5'), 'ANTHROPIC');
  assert.equal(provedorDoModelo('gemini-2.5-pro'), 'GOOGLE');
  assert.equal(provedorDoModelo('gpt-5'), 'OPENAI');
  assert.equal(provedorDoModelo('o3-mini'), 'OPENAI');
  assert.equal(provedorDoModelo('outro-modelo'), 'OUTRO');
});

test('a legenda dá o tom pelo nível do modelo: rápido claro, padrão médio, analítico escuro, e o nível mais forte vence', () => {
  const legenda = montarLegendaDeCusto([
    { modelo: 'gpt-5', niveis: ['ANALITICO'] },
    { modelo: 'claude-sonnet-5-5', niveis: ['PADRAO', 'ANALITICO'] },
    { modelo: 'gemini-pro', niveis: ['PADRAO'] },
    { modelo: 'claude-haiku-5-5', niveis: ['RAPIDO'] },
    { modelo: 'claude-antigo', niveis: [] },
  ] as ModeloDeCusto[]);
  const cores = Object.fromEntries(legenda.map((item) => [item.modelo, item.cor]));
  assert.equal(cores['claude-haiku-5-5'], '#fdba74');
  assert.equal(cores['claude-sonnet-5-5'], '#c2410c');
  assert.equal(cores['claude-antigo'], '#f97316');
  assert.equal(cores['gemini-pro'], '#3b82f6');
  assert.equal(cores['gpt-5'], '#374151');
  assert.deepEqual(legenda.map((item) => item.modelo), ['claude-antigo', 'claude-haiku-5-5', 'claude-sonnet-5-5', 'gemini-pro', 'gpt-5']);
});

test('o custo do dia é empilhado por modelo, o total fica no segmento do topo e modelo sem custo não vira segmento', () => {
  const [dia] = montarCategoriasDeCusto(
    [
      {
        periodo: '2026-10-19',
        mensagens: 3,
        tokens: 30,
        custoDolar: 0.75,
        modelos: [
          { modelo: 'claude-haiku-5-5', mensagens: 1, tokens: 10, custoDolar: 0.25 },
          { modelo: 'claude-sonnet-5-5', mensagens: 1, tokens: 10, custoDolar: 0.5 },
          { modelo: 'sem-preco', mensagens: 1, tokens: 10, custoDolar: 0 },
        ],
      },
    ],
    [
      { modelo: 'claude-haiku-5-5', niveis: ['RAPIDO'] },
      { modelo: 'claude-sonnet-5-5', niveis: ['ANALITICO'] },
    ] as ModeloDeCusto[],
  );
  assert.deepEqual(dia.barras.map((barra) => barra.valor), [0.25, 0.5]);
  assert.deepEqual(dia.barras.map((barra) => normalizar(barra.rotulo)), ['', '0,75']);
  assert.deepEqual(dia.barras.map((barra) => barra.cor), ['#fdba74', '#c2410c']);
});
