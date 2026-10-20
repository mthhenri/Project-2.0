import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { calcularCustoDolar, listarPeriodos, montarModelos, montarPeriodos, somarTotais, UsoSomado } from './calculo-de-custo';

const PRECO_SONNET = { modelo: 'sonnet', precoEntradaMilhao: 3, precoSaidaMilhao: 15, precoCacheMilhao: 0.3 };
const PRECO_HAIKU = { modelo: 'haiku', precoEntradaMilhao: 1, precoSaidaMilhao: 5, precoCacheMilhao: 0.1 };

function uso(periodo: string, modelo: string, parcial: Partial<UsoSomado> = {}): UsoSomado {
  return { periodo, modelo, chamadas: 1, tokensEntrada: 0, tokensSaida: 0, tokensCache: 0, ...parcial };
}

test('o custo soma cada tipo de token pelo preço do milhão dele', () => {
  assert.equal(calcularCustoDolar({ tokensEntrada: 2_000_000, tokensSaida: 1_000_000, tokensCache: 10_000_000 }, PRECO_SONNET), 6 + 15 + 3);
  assert.equal(calcularCustoDolar({ tokensEntrada: 1000, tokensSaida: 500, tokensCache: 0 }, PRECO_SONNET), 0.0105);
  assert.equal(calcularCustoDolar({ tokensEntrada: 0, tokensSaida: 0, tokensCache: 0 }, PRECO_SONNET), 0);
});

test('os modelos juntam uso, preços e a configuração ativa; sem preço o custo é nulo e o modelo sem uso aparece com zeros', () => {
  const modelos = montarModelos(
    [
      uso('2026-10-01', 'sonnet', { tokensEntrada: 1_000_000, chamadas: 4 }),
      uso('2026-10-02', 'sonnet', { tokensSaida: 1_000_000, chamadas: 2 }),
      uso('2026-10-02', 'modelo-sem-preco', { tokensEntrada: 500, chamadas: 9 }),
    ],
    [PRECO_SONNET, PRECO_HAIKU],
    ['haiku', 'sonnet'],
  );
  const porNome = Object.fromEntries(modelos.map((modelo) => [modelo.modelo, modelo]));
  assert.equal(porNome.sonnet.chamadas, 6);
  assert.equal(porNome.sonnet.custoDolar, 18);
  assert.equal(porNome.sonnet.emUso, true);
  assert.deepEqual([porNome.haiku.chamadas, porNome.haiku.custoDolar, porNome.haiku.emUso], [0, 0, true]);
  assert.deepEqual([porNome['modelo-sem-preco'].preco, porNome['modelo-sem-preco'].custoDolar, porNome['modelo-sem-preco'].emUso], [null, null, false]);
  assert.deepEqual(modelos.map((modelo) => modelo.modelo), ['sonnet', 'haiku', 'modelo-sem-preco']);
});

test('os totais somam tudo e contam os modelos com uso e sem preço', () => {
  const modelos = montarModelos(
    [uso('2026-10-01', 'sonnet', { tokensEntrada: 1_000_000, tokensSaida: 10, tokensCache: 5, chamadas: 3 }), uso('2026-10-01', 'sem-preco', { chamadas: 2 })],
    [PRECO_SONNET, PRECO_HAIKU],
    [],
  );
  assert.deepEqual(somarTotais(modelos), { chamadas: 5, tokensEntrada: 1_000_000, tokensSaida: 10, tokensCache: 5, custoDolar: 3.000152, modelosSemPreco: 1 });
});

test('o período traz todos os dias do mês, mesmo sem uso, e ignora o que cai fora', () => {
  const dias = listarPeriodos(2026, 2);
  assert.equal(dias.length, 28);
  assert.deepEqual([dias[0], dias[27]], ['2026-02-01', '2026-02-28']);
  const periodos = montarPeriodos(
    [uso('2026-02-03', 'sonnet', { tokensEntrada: 1_000_000, tokensSaida: 100, tokensCache: 20, chamadas: 2 }), uso('2026-03-01', 'sonnet', { tokensEntrada: 99 })],
    [PRECO_SONNET],
    dias,
  );
  assert.equal(periodos.length, 28);
  assert.deepEqual(periodos[2], { periodo: '2026-02-03', chamadas: 2, tokens: 1_000_120, custoDolar: 3.001506 });
  assert.deepEqual(periodos[0], { periodo: '2026-02-01', chamadas: 0, tokens: 0, custoDolar: 0 });
});

test('sem mês o período são os doze meses do ano', () => {
  assert.deepEqual(listarPeriodos(2026), ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
});
