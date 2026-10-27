import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { normalizarVolumeVigencia } from './volume-vigencia';

test('normaliza a data para dia 1 e preserva zero e sem volume', () => {
  for (const volumeEsperadoHoras of [160, 0, null]) {
    assert.deepEqual(normalizarVolumeVigencia({ projetoId: 1, vigenciaInicioData: '2026-04-17', volumeEsperadoHoras }), {
      projetoId: 1, vigenciaInicioData: '2026-04-01', volumeEsperadoHoras,
    });
  }
});

test('recusa data impossível, timestamp, volume ausente, negativo ou fracionário', () => {
  for (const vigenciaInicioData of ['2026-02-30', '2025-02-29', '2026-13-01', '2026-01-01T00:00:00Z', 'inválida']) {
    assert.throws(() => normalizarVolumeVigencia({ projetoId: 1, vigenciaInicioData, volumeEsperadoHoras: 40 }));
  }
  for (const volumeEsperadoHoras of [-1, 1.5, NaN, Infinity, undefined, 100001]) {
    assert.throws(() => normalizarVolumeVigencia({ projetoId: 1, vigenciaInicioData: '2026-02-01', volumeEsperadoHoras } as never));
  }
  assert.equal(normalizarVolumeVigencia({ projetoId: 1, vigenciaInicioData: '2024-02-29', volumeEsperadoHoras: 40 }).vigenciaInicioData, '2024-02-01');
});
