import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PropostaIaGrupoConfirmarDto, PropostaIaGrupoDesfazerDto, PropostaIaGrupoRecusarDto } from '@project20/shared';

// A entrada das três rotas do grupo (task 227) é a mesma lista de ids: pelo menos um, até 20, inteiros positivos e sem repetir.

const entradas = [PropostaIaGrupoConfirmarDto, PropostaIaGrupoRecusarDto, PropostaIaGrupoDesfazerDto];
const problemasDe = (classe: new () => object, corpo: unknown) => validateSync(plainToInstance(classe, corpo) as object, { whitelist: true, forbidNonWhitelisted: true }).length;

test('uma lista de ids válida é aceita nas três rotas', () => {
  for (const classe of entradas) assert.equal(problemasDe(classe, { propostaIds: [1, 2, 3] }), 0, classe.name);
});

test('os ids chegam como número mesmo vindos como texto', () => {
  for (const classe of entradas) {
    const dto = plainToInstance(classe, { propostaIds: ['4', '5'] });
    assert.deepEqual(dto.propostaIds, [4, 5], classe.name);
    assert.equal(validateSync(dto).length, 0, classe.name);
  }
});

test('lista vazia, grande demais, repetida ou com valor inválido é recusada', () => {
  for (const classe of entradas) {
    assert.ok(problemasDe(classe, { propostaIds: [] }) > 0, `${classe.name} vazia`);
    assert.ok(problemasDe(classe, { propostaIds: Array.from({ length: 21 }, (_, indice) => indice + 1) }) > 0, `${classe.name} com 21`);
    assert.equal(problemasDe(classe, { propostaIds: Array.from({ length: 20 }, (_, indice) => indice + 1) }), 0, `${classe.name} com 20`);
    assert.ok(problemasDe(classe, { propostaIds: [1, 1] }) > 0, `${classe.name} repetida`);
    assert.ok(problemasDe(classe, { propostaIds: [0] }) > 0, `${classe.name} com zero`);
    assert.ok(problemasDe(classe, { propostaIds: [1.5] }) > 0, `${classe.name} fracionada`);
    assert.ok(problemasDe(classe, { propostaIds: ['abc'] }) > 0, `${classe.name} com texto`);
    assert.ok(problemasDe(classe, {}) > 0, `${classe.name} sem lista`);
    assert.ok(problemasDe(classe, { propostaIds: [1], dono: 9 }) > 0, `${classe.name} com campo desconhecido`);
  }
});
