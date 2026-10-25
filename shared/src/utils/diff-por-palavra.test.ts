import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TrechoDiffTipoEnum } from '../enums/trecho-diff-tipo.enum';
import { compararPorPalavra, diffTemMudanca, LIMITE_DE_CELULAS_DO_DIFF_POR_PALAVRA, TrechoDiff } from './diff-por-palavra';

const { IGUAL, REMOVIDO, ADICIONADO } = TrechoDiffTipoEnum;
const antesDe = (trechos: TrechoDiff[]) => trechos.filter((trecho) => trecho.tipo !== ADICIONADO).map((trecho) => trecho.texto).join('');
const depoisDe = (trechos: TrechoDiff[]) => trechos.filter((trecho) => trecho.tipo !== REMOVIDO).map((trecho) => trecho.texto).join('');

test('texto igual vira um trecho só, sem mudança', () => {
  const trechos = compararPorPalavra('revisar o contrato', 'revisar o contrato');
  assert.deepEqual(trechos, [{ tipo: IGUAL, texto: 'revisar o contrato' }]);
  assert.equal(diffTemMudanca(trechos), false);
});

test('só inclusão: o que entra é adicionado e o resto fica igual', () => {
  assert.deepEqual(compararPorPalavra('revisar contrato', 'revisar o contrato'), [
    { tipo: IGUAL, texto: 'revisar ' },
    { tipo: ADICIONADO, texto: 'o ' },
    { tipo: IGUAL, texto: 'contrato' },
  ]);
});

test('só remoção: o que sai é removido e o resto fica igual', () => {
  assert.deepEqual(compararPorPalavra('revisar o contrato', 'revisar contrato'), [
    { tipo: IGUAL, texto: 'revisar ' },
    { tipo: REMOVIDO, texto: 'o ' },
    { tipo: IGUAL, texto: 'contrato' },
  ]);
});

test('troca no meio: a palavra antiga é removida e a nova adicionada, com o começo e o fim iguais', () => {
  assert.deepEqual(compararPorPalavra('enviar proposta ao cliente hoje', 'enviar contrato ao cliente hoje'), [
    { tipo: IGUAL, texto: 'enviar ' },
    { tipo: REMOVIDO, texto: 'proposta' },
    { tipo: ADICIONADO, texto: 'contrato' },
    { tipo: IGUAL, texto: ' ao cliente hoje' },
  ]);
});

test('lido sem os adicionados dá o antes, e sem os removidos dá o depois (acento, Markdown e quebras de linha)', () => {
  const antes = '## Decisão\n\n- **migração** do módulo\n- revisão técnica\n';
  const depois = '## Decisão final\n\n- **migração** do módulo de ponto\n- revisão técnica e jurídica\n';
  const trechos = compararPorPalavra(antes, depois);
  assert.equal(antesDe(trechos), antes);
  assert.equal(depoisDe(trechos), depois);
  assert.equal(diffTemMudanca(trechos), true);
});

test('quando só o espaço difere, a mudança aparece e nada se perde', () => {
  const trechos = compararPorPalavra('a  b', 'a b');
  assert.equal(antesDe(trechos), 'a  b');
  assert.equal(depoisDe(trechos), 'a b');
  assert.equal(diffTemMudanca(trechos), true);
});

test('vazio dos dois lados não tem trecho; vazio de um lado é tudo adicionado ou tudo removido', () => {
  assert.deepEqual(compararPorPalavra('', ''), []);
  assert.deepEqual(compararPorPalavra('', 'novo texto'), [{ tipo: ADICIONADO, texto: 'novo texto' }]);
  assert.deepEqual(compararPorPalavra('texto velho', ''), [{ tipo: REMOVIDO, texto: 'texto velho' }]);
});

test('texto grande passa do teto de custo e troca o miolo inteiro sem travar, ainda sem perder nada', () => {
  const lado = Math.ceil(Math.sqrt(LIMITE_DE_CELULAS_DO_DIFF_POR_PALAVRA)) + 50;
  const antes = Array.from({ length: lado }, (_, indice) => `a${indice}`).join(' ');
  const depois = Array.from({ length: lado }, (_, indice) => `b${indice}`).join(' ');
  const inicio = Date.now();
  const trechos = compararPorPalavra(antes, depois);
  assert.ok(Date.now() - inicio < 2000, 'o diff grande precisa ser rápido');
  assert.deepEqual(trechos.map((trecho) => trecho.tipo), [REMOVIDO, ADICIONADO]);
  assert.equal(antesDe(trechos), antes);
  assert.equal(depoisDe(trechos), depois);
});

test('o começo e o fim iguais são aparados antes do alinhamento, então texto grande com mudança pequena segue preciso', () => {
  const comum = Array.from({ length: 5000 }, (_, indice) => `p${indice}`).join(' ');
  const trechos = compararPorPalavra(`${comum} velho ${comum}`, `${comum} novo ${comum}`);
  assert.deepEqual(trechos.map((trecho) => trecho.tipo), [IGUAL, REMOVIDO, ADICIONADO, IGUAL]);
});
