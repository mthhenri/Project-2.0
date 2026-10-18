import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { dataDoBancoComoTexto } from './data-do-banco';

test('um DATE do pg (Date à meia-noite local) vira o dia certo, sem escorregar de fuso', () => {
  assert.equal(dataDoBancoComoTexto(new Date(2026, 10, 15)), '2026-11-15');
  assert.equal(dataDoBancoComoTexto(new Date(2026, 0, 1)), '2026-01-01');
  assert.equal(dataDoBancoComoTexto(new Date(2026, 11, 31)), '2026-12-31');
});

test('texto, ISO, vazio e data inválida', () => {
  assert.equal(dataDoBancoComoTexto('2026-11-15'), '2026-11-15');
  assert.equal(dataDoBancoComoTexto('2026-11-15T03:00:00.000Z'), '2026-11-15');
  assert.equal(dataDoBancoComoTexto(null), null);
  assert.equal(dataDoBancoComoTexto(undefined), null);
  assert.equal(dataDoBancoComoTexto(''), null);
  assert.equal(dataDoBancoComoTexto(new Date('invalida')), null);
});
