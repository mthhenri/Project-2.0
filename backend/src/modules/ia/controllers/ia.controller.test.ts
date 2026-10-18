import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { IaController } from './ia.controller';

const marcaAdministrador = (metodo: keyof IaController) =>
  Reflect.getMetadata('administradorOnly', IaController.prototype[metodo]) === true;

test('o estado completo é do administrador e a disponibilidade é de qualquer usuário autenticado', () => {
  assert.equal(marcaAdministrador('recuperarEstado'), true);
  assert.equal(marcaAdministrador('recuperarDisponibilidade'), false);
  assert.equal(Reflect.getMetadata('administradorOnly', IaController), undefined);
});
