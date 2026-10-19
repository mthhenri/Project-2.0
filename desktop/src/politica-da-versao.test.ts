import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  deveConferirVersao,
  enderecoParaBaixar,
  INTERVALO_DA_CONFERENCIA_DE_VERSAO_MS,
  lerVersaoPublicada,
  textoDaAtualizacao,
  versaoEhMaisNova,
} from './politica-da-versao';

test('lerVersaoPublicada: só vale com disponivel verdadeiro e uma versão no formato maior.menor.correcao', () => {
  assert.deepEqual(lerVersaoPublicada({ dados: { disponivel: true, versao: '1.2.0' } }), { versao: '1.2.0' });
  assert.equal(lerVersaoPublicada({ dados: { disponivel: false, versao: null } }), null);
  assert.equal(lerVersaoPublicada({ dados: { disponivel: true, versao: 'lixo' } }), null);
  assert.equal(lerVersaoPublicada({ dados: { disponivel: true } }), null);
  assert.equal(lerVersaoPublicada(null), null);
  assert.equal(lerVersaoPublicada('texto'), null);
});

test('versaoEhMaisNova compara número a número e nunca avisa por versão ilegível', () => {
  assert.equal(versaoEhMaisNova('1.2.0', '1.0.0'), true);
  assert.equal(versaoEhMaisNova('1.10.0', '1.9.0'), true);
  assert.equal(versaoEhMaisNova('1.0.0', '1.0.0'), false);
  assert.equal(versaoEhMaisNova('1.0.0', '1.2.0'), false);
  assert.equal(versaoEhMaisNova('lixo', '1.0.0'), false);
  assert.equal(versaoEhMaisNova('1.2.0', 'lixo'), false);
});

test('a versão é conferida na primeira vez e depois só de hora em hora', () => {
  assert.equal(deveConferirVersao(null, 1_000), true);
  assert.equal(deveConferirVersao(1_000, 1_000 + INTERVALO_DA_CONFERENCIA_DE_VERSAO_MS - 1), false);
  assert.equal(deveConferirVersao(1_000, 1_000 + INTERVALO_DA_CONFERENCIA_DE_VERSAO_MS), true);
});

test('enderecoParaBaixar acrescenta o pedido de download ao endereço do Project, sem perder o resto', () => {
  assert.equal(enderecoParaBaixar('http://localhost:4200/'), 'http://localhost:4200/?baixar-desktop=1');
  assert.equal(enderecoParaBaixar('https://project.exemplo.com/app/?x=1'), 'https://project.exemplo.com/app/?x=1&baixar-desktop=1');
});

test('textoDaAtualizacao só existe quando a publicada é mais nova que a instalada', () => {
  assert.equal(textoDaAtualizacao({ versao: '1.2.0' }, '1.0.0'), 'Nova versão disponível (v1.2.0): baixar');
  assert.equal(textoDaAtualizacao({ versao: '1.0.0' }, '1.0.0'), null);
  assert.equal(textoDaAtualizacao(null, '1.0.0'), null);
});
