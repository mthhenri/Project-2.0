import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSync } from 'class-validator';
import { DemandaTextosAlterarDto } from './DemandaTextosAlterarDto';

const validar = (campos: object) => validateSync(Object.assign(new DemandaTextosAlterarDto(), campos));

test('textos da demanda: a versão lida é obrigatória e inteira a partir de 1; os textos são opcionais', () => {
  assert.equal(validar({ versao: 1 }).length, 0);
  assert.equal(validar({ versao: 3, descricaoTecnica: 'a', descricaoCliente: 'b', documentacao: 'c' }).length, 0);
  for (const versao of [undefined, 0, -1, 1.5, 'x']) assert.ok(validar({ versao, documentacao: 'c' }).length > 0);
});

test('textos da demanda: texto que não é string é recusado', () => {
  assert.ok(validar({ versao: 1, documentacao: 42 }).length > 0);
});
