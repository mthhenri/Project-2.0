import { test } from 'vitest';
import * as assert from 'node:assert/strict';
import { TipoAtividadeStatusEnum } from '@project20/shared';
import { visualStatusAtividade } from './atividade.model';

test('cada status da atividade tem uma forma própria, e Desenvolvendo usa a cor do tema', () => {
  const formas = Object.values(TipoAtividadeStatusEnum).map((status) => visualStatusAtividade(status).forma);
  assert.equal(new Set(formas).size, formas.length);
  assert.deepEqual(formas, ['tracejado', 'traco', 'play', 'check']);
  assert.equal(visualStatusAtividade(TipoAtividadeStatusEnum.DESENVOLVENDO).cor, 'var(--app-realce-primario)');
});
