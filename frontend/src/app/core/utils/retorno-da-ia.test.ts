import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { EstadoIaEnum } from '@project20/shared';
import { estadoEfetivoDaIa, iaVoltou } from './retorno-da-ia';

test('no modo convencional a IA no ar continua parecendo fora do ar para as telas convencionais', () => {
  assert.equal(estadoEfetivoDaIa(EstadoIaEnum.NO_AR, true), EstadoIaEnum.FORA_DO_AR);
  assert.equal(estadoEfetivoDaIa(EstadoIaEnum.NO_AR, false), EstadoIaEnum.NO_AR);
});

test('o modo convencional não esconde uma IA desligada, fora do ar ou desconhecida', () => {
  assert.equal(estadoEfetivoDaIa(EstadoIaEnum.DESLIGADA, true), EstadoIaEnum.DESLIGADA);
  assert.equal(estadoEfetivoDaIa(EstadoIaEnum.FORA_DO_AR, true), EstadoIaEnum.FORA_DO_AR);
  assert.equal(estadoEfetivoDaIa(null, true), null);
});

test('a IA voltou só quando estava fora do ar ou desligada e agora está no ar', () => {
  assert.equal(iaVoltou(EstadoIaEnum.FORA_DO_AR, EstadoIaEnum.NO_AR), true);
  assert.equal(iaVoltou(EstadoIaEnum.DESLIGADA, EstadoIaEnum.NO_AR), true);
  assert.equal(iaVoltou(EstadoIaEnum.NO_AR, EstadoIaEnum.NO_AR), false);
  assert.equal(iaVoltou(null, EstadoIaEnum.NO_AR), false);
  assert.equal(iaVoltou(EstadoIaEnum.NO_AR, EstadoIaEnum.FORA_DO_AR), false);
});
