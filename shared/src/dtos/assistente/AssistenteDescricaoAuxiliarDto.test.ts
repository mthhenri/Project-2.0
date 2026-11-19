import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSync } from 'class-validator';
import { AssistenteDescricaoAuxiliarDto } from './AssistenteDescricaoAuxiliarDto';

// Os limites de tamanho (task 370) são os da rota irmã `alterar-trecho`: o texto como o bloco (8000) e o nome como o pedido (2000).

const validar = (campos: object) =>
    validateSync(Object.assign(new AssistenteDescricaoAuxiliarDto(), { textoOriginal: 'arrumei o login', tipoEntidade: 'execucao', contextoEntidade: 'Tela de login', ...campos }));

test('descrição auxiliada: um pedido normal é válido', () => {
    assert.equal(validar({}).length, 0);
    assert.equal(validar({ tipoEntidade: 'demanda' }).length, 0);
});

test('descrição auxiliada: o texto original vai até 8000 caracteres e mais que isso é recusado', () => {
    assert.equal(validar({ textoOriginal: 'a'.repeat(8000) }).length, 0);
    const erros = validar({ textoOriginal: 'a'.repeat(8001) });
    assert.ok(erros.some((erro) => erro.property === 'textoOriginal' && 'maxLength' in (erro.constraints ?? {})));
});

test('descrição auxiliada: o contexto da entidade vai até 2000 caracteres e mais que isso é recusado', () => {
    assert.equal(validar({ contextoEntidade: 'a'.repeat(2000) }).length, 0);
    const erros = validar({ contextoEntidade: 'a'.repeat(2001) });
    assert.ok(erros.some((erro) => erro.property === 'contextoEntidade' && 'maxLength' in (erro.constraints ?? {})));
});

test('descrição auxiliada: texto curto demais, tipo desconhecido e contexto vazio continuam recusados', () => {
    assert.ok(validar({ textoOriginal: 'curto' }).length > 0);
    assert.ok(validar({ tipoEntidade: 'projeto' }).length > 0);
    assert.ok(validar({ contextoEntidade: '' }).length > 0);
});
