import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSync } from 'class-validator';
import { ProjetoVolumeVigenciaCriarDto } from './ProjetoVolumeVigenciaCriarDto';

test('vigência exige valor explícito, aceita zero e null e recusa data inválida', () => {
  const validar = (campos: object) => validateSync(Object.assign(new ProjetoVolumeVigenciaCriarDto(), { projetoId: 1, vigenciaInicioData: '2026-04-17' }, campos));
  for (const volumeEsperadoHoras of [160, 0, null]) assert.equal(validar({ volumeEsperadoHoras }).length, 0);
  for (const volumeEsperadoHoras of [undefined, -1, 1.5, 100001]) assert.ok(validar({ volumeEsperadoHoras }).length > 0);
  for (const vigenciaInicioData of ['2026-02-30', '2026-04-01T00:00:00Z']) assert.ok(validar({ vigenciaInicioData, volumeEsperadoHoras: 160 }).length > 0);
});
