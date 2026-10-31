import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { validarAmbienteSeed } from './seed-historico-desenvolvimento';

test('seed exige development explícito e recusa configurações incompatíveis', () => {
  for (const ambiente of [{}, { APP_AMBIENTE: 'production' }, { APP_AMBIENTE: 'test' },
    { APP_AMBIENTE: 'development', DB_SSL: 'true' },
    { APP_AMBIENTE: 'development', NODE_ENV: 'production' }]) {
    assert.throws(() => validarAmbienteSeed(ambiente), /Seed permitido somente/);
  }
  assert.doesNotThrow(() => validarAmbienteSeed({ APP_AMBIENTE: 'development', DB_SSL: 'false' }));
});
