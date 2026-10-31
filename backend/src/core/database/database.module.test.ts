import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { DatabaseModule } from './database.module';

test('a parada da aplicação fecha o pool de conexões (senão o processo não termina no SIGTERM)', async () => {
  let fechado = 0;
  const modulo = new DatabaseModule({ destroy: async () => { fechado++; } } as never);

  await modulo.onApplicationShutdown();

  assert.equal(fechado, 1);
});
