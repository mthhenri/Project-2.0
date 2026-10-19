import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { limiteParaDesfazerProposta, podeDesfazerProposta, PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS } from './prazo-para-desfazer-proposta';

const RESOLVIDA = new Date('2026-10-19T15:00:00Z');
const depois = (minutos: number) => new Date(RESOLVIDA.getTime() + minutos * 60_000);

test('o prazo é de 30 minutos e o limite é a resolução mais o prazo', () => {
  assert.equal(PRAZO_PARA_DESFAZER_PROPOSTA_MINUTOS, 30);
  assert.equal(limiteParaDesfazerProposta(RESOLVIDA)?.toISOString(), '2026-10-19T15:30:00.000Z');
});

test('dentro do prazo, e no limite exato, ainda pode desfazer; um segundo depois não', () => {
  assert.equal(podeDesfazerProposta(RESOLVIDA, depois(5)), true);
  assert.equal(podeDesfazerProposta(RESOLVIDA, depois(30)), true);
  assert.equal(podeDesfazerProposta(RESOLVIDA, new Date(depois(30).getTime() + 1000)), false);
  assert.equal(podeDesfazerProposta(RESOLVIDA, depois(40)), false);
});

test('aceita a data como texto ISO; sem data ou com data inválida não há prazo a medir', () => {
  assert.equal(podeDesfazerProposta('2026-10-19T15:00:00Z', depois(10)), true);
  assert.equal(podeDesfazerProposta('2026-10-19T15:00:00Z', depois(31)), false);
  assert.equal(limiteParaDesfazerProposta(null), null);
  assert.equal(limiteParaDesfazerProposta('não é data'), null);
  assert.equal(podeDesfazerProposta(null, depois(999)), true);
});
