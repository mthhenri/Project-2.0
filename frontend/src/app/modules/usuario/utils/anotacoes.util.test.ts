import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { TIPOS_ANOTACAO_ORDENADOS } from '@project20/shared';
import { anotacaoTemTexto, ICONE_SECAO_ANOTACAO, ROTULO_SECAO_ANOTACAO, tempoDecorrido } from './anotacoes.util';

test('anotacaoTemTexto: só espaços, quebras de linha, vazio e nulos não contam', () => {
  assert.equal(anotacaoTemTexto('lembrar'), true);
  assert.equal(anotacaoTemTexto('  \n\t '), false);
  assert.equal(anotacaoTemTexto(''), false);
  assert.equal(anotacaoTemTexto(null), false);
  assert.equal(anotacaoTemTexto(undefined), false);
});

const AGORA = new Date('2026-01-15T12:00:00Z');
const antes = (segundos: number) => new Date(AGORA.getTime() - segundos * 1000);

test('tempoDecorrido: faixas de segundos, minutos, horas e dias', () => {
  assert.equal(tempoDecorrido(antes(0), AGORA), 'agora há pouco');
  assert.equal(tempoDecorrido(antes(59), AGORA), 'agora há pouco');
  assert.equal(tempoDecorrido(antes(60), AGORA), 'há 1 min');
  assert.equal(tempoDecorrido(antes(59 * 60), AGORA), 'há 59 min');
  assert.equal(tempoDecorrido(antes(60 * 60), AGORA), 'há 1 h');
  assert.equal(tempoDecorrido(antes(23 * 3600), AGORA), 'há 23 h');
  assert.equal(tempoDecorrido(antes(24 * 3600), AGORA), 'há 1 dia');
  assert.equal(tempoDecorrido(antes(3 * 24 * 3600), AGORA), 'há 3 dias');
});

test('tempoDecorrido: data no futuro vira "agora há pouco" e string ISO é aceita', () => {
  assert.equal(tempoDecorrido(new Date(AGORA.getTime() + 5000), AGORA), 'agora há pouco');
  assert.equal(tempoDecorrido('2026-01-15T11:50:00Z', AGORA), 'há 10 min');
});

test('rótulos e ícones cobrem as cinco seções, na ordem de exibição', () => {
  assert.deepEqual(TIPOS_ANOTACAO_ORDENADOS.map((tipo) => ROTULO_SECAO_ANOTACAO[tipo]), ['Em andamento', 'Feito', 'Pendências', 'Lembretes', 'Pessoal']);
  for (const tipo of TIPOS_ANOTACAO_ORDENADOS) assert.ok(ICONE_SECAO_ANOTACAO[tipo].startsWith('pi pi-'), tipo);
});
