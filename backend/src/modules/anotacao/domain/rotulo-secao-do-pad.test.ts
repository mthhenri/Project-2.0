import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TIPOS_ANOTACAO_ORDENADOS, TipoAnotacaoEnum } from '@project20/shared';
import { ROTULO_SECAO_DO_PAD } from './rotulo-secao-do-pad';

test('toda seção do pad tem rótulo, e os rótulos são os que a tela mostra', () => {
  assert.deepEqual(TIPOS_ANOTACAO_ORDENADOS.map((tipo) => ROTULO_SECAO_DO_PAD[tipo]), ['Em andamento', 'Feito', 'Pendências', 'Lembretes', 'Pessoal']);
  assert.equal(Object.keys(ROTULO_SECAO_DO_PAD).length, Object.values(TipoAnotacaoEnum).length);
});

test('os rótulos não se repetem', () => {
  assert.equal(new Set(Object.values(ROTULO_SECAO_DO_PAD)).size, Object.keys(ROTULO_SECAO_DO_PAD).length);
});
