import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TokensSomados } from '../../chat/domain/chat-consultas';
import { agruparPeloNomeConhecido, calcularCustoDolar, listarPeriodos, montarModelos, montarPeriodos, somarTotais } from './calculo-de-custo';

const PRECO_SONNET = { modelo: 'sonnet', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 };
const PRECO_HAIKU = { modelo: 'haiku', precoEntradaMilhao: 1, precoSaidaMilhao: 5, precoCacheMilhao: 0.1 };

function uso(periodo: string, modelo: string, parcial: Partial<TokensSomados> = {}): TokensSomados {
  return { periodo, modelo, mensagens: 1, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0, ...parcial };
}

test('o custo soma cada tipo de token pelo preço do milhão dele', () => {
  assert.equal(calcularCustoDolar({ tokensEntrada: 2_000_000, tokensSaida: 1_000_000, tokensCache: 10_000_000 }, PRECO_SONNET), 6 + 15 + 3);
  assert.equal(calcularCustoDolar({ tokensEntrada: 1000, tokensSaida: 500, tokensCache: 0 }, PRECO_SONNET), 0.0105);
  assert.equal(calcularCustoDolar({ tokensEntrada: 0, tokensSaida: 0, tokensCache: 0 }, PRECO_SONNET), 0);
});

test('os modelos juntam uso, preços e a configuração ativa; sem preço o custo é nulo e o modelo sem uso aparece com zeros', () => {
  const modelos = montarModelos(
    [
      uso('2026-10-01', 'sonnet', { tokensEntrada: 1_000_000, mensagens: 4 }),
      uso('2026-10-02', 'sonnet', { tokensSaida: 1_000_000, mensagens: 2 }),
      uso('2026-10-02', 'modelo-sem-preco', { tokensEntrada: 500, mensagens: 9 }),
    ],
    [PRECO_SONNET, PRECO_HAIKU],
    ['haiku', 'sonnet'],
  );
  const porNome = Object.fromEntries(modelos.map((modelo) => [modelo.modelo, modelo]));
  assert.equal(porNome.sonnet.mensagens, 6);
  assert.equal(porNome.sonnet.custoDolar, 18);
  assert.equal(porNome.sonnet.emUso, true);
  assert.deepEqual([porNome.haiku.mensagens, porNome.haiku.custoDolar, porNome.haiku.emUso], [0, 0, true]);
  assert.deepEqual([porNome['modelo-sem-preco'].preco, porNome['modelo-sem-preco'].custoDolar, porNome['modelo-sem-preco'].emUso], [null, null, false]);
  assert.deepEqual(modelos.map((modelo) => modelo.modelo), ['sonnet', 'haiku', 'modelo-sem-preco']);
});

test('os totais somam tudo e contam os modelos com uso e sem preço', () => {
  const modelos = montarModelos(
    [uso('2026-10-01', 'sonnet', { tokensEntrada: 1_000_000, tokensSaida: 10, tokensCache: 5, mensagens: 3 }), uso('2026-10-01', 'sem-preco', { mensagens: 2 })],
    [PRECO_SONNET, PRECO_HAIKU],
    [],
  );
  assert.deepEqual(somarTotais(modelos), { mensagens: 5, tokensEntrada: 1_000_000, tokensSaida: 10, tokensCache: 5, custoDolar: 3.000152, modelosSemPreco: 1 });
});

test('o período traz todos os dias do mês, mesmo sem uso, e ignora o que cai fora', () => {
  const dias = listarPeriodos(2026, 2);
  assert.equal(dias.length, 28);
  assert.deepEqual([dias[0], dias[27]], ['2026-02-01', '2026-02-28']);
  const periodos = montarPeriodos(
    [uso('2026-02-03', 'sonnet', { tokensEntrada: 1_000_000, tokensSaida: 100, tokensCache: 20, mensagens: 2 }), uso('2026-03-01', 'sonnet', { tokensEntrada: 99 })],
    [PRECO_SONNET],
    dias,
  );
  assert.equal(periodos.length, 28);
  assert.deepEqual(periodos[2], { periodo: '2026-02-03', mensagens: 2, tokens: 1_000_120, custoDolar: 3.001506 });
  assert.deepEqual(periodos[0], { periodo: '2026-02-01', mensagens: 0, tokens: 0, custoDolar: 0 });
});

test('sem mês o período são os doze meses do ano', () => {
  assert.deepEqual(listarPeriodos(2026), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
});

test('o id datado que o provedor devolve (nome + data de 8 dígitos) conta no nome conhecido, e as linhas que se juntam são somadas', () => {
  const agrupado = agruparPeloNomeConhecido(
    [
      uso('2026-10-01', 'claude-haiku-5-5', { mensagens: 2, tokensEntrada: 10 }),
      uso('2026-10-01', 'claude-haiku-5-5-20261015', { mensagens: 1, tokensEntrada: 5, tokensSaida: 3 }),
      uso('2026-10-02', 'claude-haiku-5-5-20261015', { mensagens: 1, tokensEntrada: 7 }),
      uso('2026-10-01', 'claude-haiku-55', { mensagens: 1 }),
      uso('2026-10-01', 'outro-modelo', { mensagens: 4 }),
    ],
    ['claude-haiku-5', 'claude-haiku-5-5'],
  );
  assert.deepEqual(agrupado.map((linha) => [linha.periodo, linha.modelo, linha.mensagens, linha.tokensEntrada, linha.tokensSaida]), [
    ['2026-10-01', 'claude-haiku-5-5', 3, 15, 3],
    ['2026-10-02', 'claude-haiku-5-5', 1, 7, 0],
    ['2026-10-01', 'claude-haiku-55', 1, 0, 0],
    ['2026-10-01', 'outro-modelo', 4, 0, 0],
  ]);
});

test('um nome que só é prefixo de outro modelo não o engole: claude-opus-5-5 sem preço não vira claude-opus-5', () => {
  const agrupado = agruparPeloNomeConhecido(
    [uso('2026-10-01', 'claude-opus-5-5-20261015', { mensagens: 1 }), uso('2026-10-01', 'claude-opus-5-5', { mensagens: 1 }), uso('2026-10-01', 'claude-opus-5-20261015', { mensagens: 1 })],
    ['claude-opus-5'],
  );
  assert.deepEqual(agrupado.map((linha) => [linha.modelo, linha.mensagens]), [['claude-opus-5-5-20261015', 1], ['claude-opus-5-5', 1], ['claude-opus-5', 1]]);
});
